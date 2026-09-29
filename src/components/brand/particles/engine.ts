/*
 * The particle engine behind every animation in the app: small outlined triangles on a 2D canvas.
 *
 * A *scene* decides where each of its particles should be (its target) and how visible it is; the engine
 * springs every particle towards its target, adds a light field of drifting "ambient" triangles, pushes
 * particles away from the mouse and draws everything.
 *
 * It pauses when the canvas is off-screen or the tab is hidden, and under prefers-reduced-motion it draws
 * one still frame. Colours come from the theme's CSS variables, so the palette lives only in theme.css.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where the spring pulls the particle this frame (set by the scene). */
  tx: number;
  ty: number;
  /** Size of the triangle (circumradius, px). */
  size: number;
  rot: number;
  spin: number;
  /** Index into PALETTE. */
  color: number;
  /** Opacity this frame (set by the scene). */
  alpha: number;
  /** Spring stiffness (set by the scene). Low = floaty, high = holds the shape tightly. */
  k: number;
  /** A particle stays where it is until its scene activates it. */
  active: boolean;
  /**
   * How disturbed the particle is (0–1), raised by the mouse. A disturbed particle has a looser spring,
   * so it drifts back and settles with a soft wobble instead of snapping into place. Managed by the engine.
   */
  kick?: number;
}

/** A box in canvas pixels. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParticleScene {
  readonly particles: Particle[];
  /** Called when the canvas (or the anchor element) changes size. */
  layout(width: number, height: number, anchor: Box | null): void;
  /** Called every frame before the physics step. `time` is seconds since the scene started. */
  update(time: number, dt: number): void;
  /** Scene time used for the single still frame under prefers-reduced-motion. */
  readonly stillTime: number;
}

export interface EngineOptions {
  /** Ambient triangles per 10,000 px² of canvas. */
  ambient: number;
  /** Push particles away from the mouse. */
  interactive: boolean;
  /** Element whose box the scene should fit its shape into. */
  anchor?: () => HTMLElement | null;
  lineWidth?: number;
  /**
   * A dark outline drawn under every triangle, so the shape stays readable over light content.
   * `color` may be a theme variable name such as "--color-navy".
   */
  halo?: { color: string; width: number };
}

/** Palette: orange, ocean blue, white and a little warning amber. */
export const PALETTE_VARS = ["--color-orange", "--color-ocean-soft", "--color-white", "--color-warning"];
export const ORANGE = 0;
export const OCEAN = 1;
export const WHITE = 2;
export const AMBER = 3;

export function pickColor(weights: number[]): number {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

const AMBIENT_WEIGHTS = [0.3, 0.34, 0.28, 0.08];
const ALPHA_LEVELS = 16;

// Mouse "wind": particles near the cursor are blown outwards and dragged along with the cursor's movement
const MOUSE_RADIUS = 120; // px
const MOUSE_PUSH = 5200; // outward acceleration right under the cursor, px/s²
const MOUSE_DRAG = 3.2; // how much of the cursor's speed is passed on
const KICK_RATE = 6; // how quickly particles become "disturbed" under the cursor
const KICK_RECOVERY = 0.7; // how quickly they calm down again (per second)

interface Drifter {
  x: number;
  y: number;
  /** Steady drift, px/s */
  vx: number;
  vy: number;
  /** Extra velocity from the mouse, fades out with friction */
  ex: number;
  ey: number;
  size: number;
  rot: number;
  spin: number;
  color: number;
  alpha: number;
}

/** Start animating `scene` on `canvas`. Returns a function that stops everything and cleans up. */
export function startParticleCanvas(canvas: HTMLCanvasElement, scene: ParticleScene, options: EngineOptions): () => void {
  const host = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  if (!host || !ctx) return () => {};

  const styles = getComputedStyle(document.documentElement);
  const palette = PALETTE_VARS.map((v) => styles.getPropertyValue(v).trim() || "#ffffff");
  const haloColor = options.halo?.color.startsWith("--")
    ? styles.getPropertyValue(options.halo.color).trim() || "#0a2540"
    : options.halo?.color;

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;

  let width = 0;
  let height = 0;
  let layoutKey = "";
  let drifters: Drifter[] = [];
  let raf = 0;
  let last = 0;
  let time = 0;
  let visible = true;
  // Cursor position and velocity (px/s) inside the canvas
  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0, active: false };
  // Reused every frame: one list of particles per colour and opacity level, drawn with a single stroke()
  const buckets: Array<Array<{ x: number; y: number; size: number; rot: number }>> = Array.from(
    { length: palette.length * ALPHA_LEVELS },
    () => [],
  );

  function layout() {
    const rect = host!.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const anchorEl = options.anchor?.();
    const a = anchorEl?.getBoundingClientRect();
    const anchor = a ? { x: a.left - rect.left, y: a.top - rect.top, width: a.width, height: a.height } : null;

    // Skip repeated calls with the same sizes (ResizeObserver fires once on start)
    const key = [rect.width, rect.height, anchor?.x, anchor?.y, anchor?.width, anchor?.height]
      .map((v) => Math.round(v ?? -1))
      .join(",");
    if (key === layoutKey) return;
    layoutKey = key;

    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    scene.layout(width, height, anchor);

    const count = Math.round(((width * height) / 10000) * options.ambient);
    drifters = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 10, // px per second
      vy: (Math.random() - 0.5) * 8,
      ex: 0,
      ey: 0,
      size: 1.2 + Math.random() * 1.5,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.5,
      color: pickColor(AMBIENT_WEIGHTS),
      alpha: 0.12 + Math.random() * 0.22,
    }));

    if (reduced) drawStill();
  }

  function drawStill() {
    scene.update(scene.stillTime, 0);
    for (const p of scene.particles) {
      p.x = p.tx;
      p.y = p.ty;
      p.active = true;
    }
    draw();
  }

  /**
   * The mouse's push on a particle at (x, y): outward from the cursor plus a share of the cursor's own
   * movement, both fading to zero at MOUSE_RADIUS. Returns null when the particle is out of reach.
   */
  function mouseForce(x: number, y: number): { ax: number; ay: number; strength: number } | null {
    if (!pointer.active) return null;
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const d2 = dx * dx + dy * dy;
    if (d2 >= MOUSE_RADIUS * MOUSE_RADIUS) return null;
    const d = Math.sqrt(d2) || 0.001;
    const strength = (1 - d / MOUSE_RADIUS) ** 2;
    return {
      ax: (dx / d) * MOUSE_PUSH * strength + pointer.vx * MOUSE_DRAG * strength,
      ay: (dy / d) * MOUSE_PUSH * strength + pointer.vy * MOUSE_DRAG * strength,
      strength,
    };
  }

  function physics(dt: number) {
    // The cursor's velocity fades when it stops moving
    const still = Math.exp(-8 * dt);
    pointer.vx *= still;
    pointer.vy *= still;

    for (const p of scene.particles) {
      p.rot += p.spin * dt;
      if (!p.active) continue;
      let kick = p.kick ?? 0;
      // A disturbed particle has a looser, bouncier spring, so it floats home instead of snapping back
      const k = p.k * (1 - 0.72 * kick);
      const damping = 2 * Math.sqrt(k) * (0.8 - 0.35 * kick);
      let ax = (p.tx - p.x) * k - p.vx * damping;
      let ay = (p.ty - p.y) * k - p.vy * damping;
      const push = mouseForce(p.x, p.y);
      if (push) {
        ax += push.ax;
        ay += push.ay;
        kick = Math.min(1, kick + push.strength * KICK_RATE * dt);
      }
      p.kick = Math.max(0, kick - KICK_RECOVERY * dt);
      p.vx += ax * dt;
      p.vy += ay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Ambient dust: blown around by the mouse, then friction hands it back to its slow drift
    const friction = Math.exp(-1.6 * dt);
    for (const d of drifters) {
      d.rot += d.spin * dt;
      const push = mouseForce(d.x, d.y);
      if (push) {
        d.ex += push.ax * 0.35 * dt;
        d.ey += push.ay * 0.35 * dt;
      }
      d.ex *= friction;
      d.ey *= friction;
      d.x += (d.vx + d.ex) * dt;
      d.y += (d.vy + d.ey) * dt;
      if (d.x < -10) d.x = width + 10;
      if (d.x > width + 10) d.x = -10;
      if (d.y < -10) d.y = height + 10;
      if (d.y > height + 10) d.y = -10;
    }
  }

  function queue(x: number, y: number, size: number, rot: number, color: number, alpha: number) {
    if (alpha < 0.02) return;
    const level = Math.min(ALPHA_LEVELS - 1, Math.round(alpha * (ALPHA_LEVELS - 1)));
    buckets[color * ALPHA_LEVELS + level].push({ x, y, size, rot });
  }

  function draw() {
    ctx!.clearRect(0, 0, width, height);
    ctx!.lineWidth = options.lineWidth ?? 1;
    ctx!.lineJoin = "round";
    ctx!.lineCap = "round";
    for (const b of buckets) b.length = 0;
    for (const d of drifters) queue(d.x, d.y, d.size, d.rot, d.color, d.alpha);
    for (const p of scene.particles) queue(p.x, p.y, p.size, p.rot, p.color, p.alpha);

    const lineWidth = options.lineWidth ?? 1;
    buckets.forEach((list, i) => {
      if (list.length === 0) return;
      const alpha = (i % ALPHA_LEVELS) / (ALPHA_LEVELS - 1);
      ctx!.beginPath();
      for (const t of list) {
        const r = t.size;
        ctx!.moveTo(t.x + Math.cos(t.rot) * r, t.y + Math.sin(t.rot) * r);
        ctx!.lineTo(t.x + Math.cos(t.rot + 2.0944) * r, t.y + Math.sin(t.rot + 2.0944) * r);
        ctx!.lineTo(t.x + Math.cos(t.rot + 4.1888) * r, t.y + Math.sin(t.rot + 4.1888) * r);
        ctx!.closePath();
      }
      if (options.halo && haloColor) {
        // Same path, stroked twice: a wide dark halo first, then the coloured triangle on top
        ctx!.strokeStyle = haloColor;
        ctx!.lineWidth = options.halo.width;
        ctx!.globalAlpha = alpha * 0.7;
        ctx!.stroke();
        ctx!.lineWidth = lineWidth;
      }
      ctx!.strokeStyle = palette[Math.floor(i / ALPHA_LEVELS)];
      ctx!.globalAlpha = alpha;
      ctx!.stroke();
    });
    ctx!.globalAlpha = 1;
  }

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt;
    scene.update(time, dt);
    physics(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (reduced || raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  layout();
  start();

  const resizeObserver = new ResizeObserver(() => layout());
  resizeObserver.observe(host);
  const anchorEl = options.anchor?.();
  if (anchorEl) resizeObserver.observe(anchorEl);

  const intersection = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    },
    { threshold: 0 },
  );
  intersection.observe(canvas);

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);

  const onMotionChange = () => {
    reduced = motionQuery.matches;
    if (reduced) {
      stop();
      drawStill();
    } else {
      start();
    }
  };
  motionQuery.addEventListener("change", onMotionChange);

  const onPointerMove = (e: PointerEvent) => {
    if (!options.interactive || reduced || e.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    const elapsed = (now - pointer.t) / 1000;
    if (pointer.active && elapsed > 0 && elapsed < 0.1) {
      // Smoothed cursor velocity, capped so a flick doesn't fling particles off screen
      const cap = 2400;
      pointer.vx = pointer.vx * 0.5 + Math.max(-cap, Math.min(cap, (x - pointer.x) / elapsed)) * 0.5;
      pointer.vy = pointer.vy * 0.5 + Math.max(-cap, Math.min(cap, (y - pointer.y) / elapsed)) * 0.5;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.t = now;
    pointer.active = true;
  };
  const onPointerLeave = () => {
    pointer.active = false;
    pointer.vx = 0;
    pointer.vy = 0;
  };
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerleave", onPointerLeave);

  return () => {
    stop();
    resizeObserver.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    motionQuery.removeEventListener("change", onMotionChange);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerleave", onPointerLeave);
  };
}
