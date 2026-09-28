import { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";

/*
 * The PlayBook take on Dala's signature visual: small outlined triangles that fly in and
 * assemble into a dumbbell, drift gently, and shy away from the mouse. A sparse field of
 * ambient triangles floats across the rest of the section at low opacity.
 *
 * Plain 2D canvas, no libraries. It pauses when scrolled off-screen or when the tab is hidden,
 * and draws one still frame (no animation, no mouse) under prefers-reduced-motion.
 * Colours are read from the theme's CSS variables, so the palette lives only in theme.css.
 */

interface ParticleFieldProps {
  /** "dumbbell" assembles the gym shape; "none" leaves only the ambient field. */
  shape?: "dumbbell" | "none";
  /** Multiplies how many triangles make up the shape (1 = landing hero, ~0.35 = login panel). */
  density?: number;
  /** Ambient triangles per 10,000 px² of canvas. */
  ambient?: number;
  /** Opacity of the assembled shape. */
  shapeOpacity?: number;
  interactive?: boolean;
  /** The shape is fitted inside this element's box (e.g. the hero's right column). */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Fallback placement when there is no anchor: centre (0–1) and size (fraction of the shorter side). */
  placement?: { x: number; y: number; size: number };
  /** Tilt of the dumbbell in degrees. */
  tilt?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number; // target (shape) or drift velocity (ambient)
  ty: number;
  size: number;
  rot: number;
  spin: number;
  color: number;
  alpha: number;
  phase: number;
  delay: number;
  ambient: boolean;
}

const PALETTE_VARS = ["--color-orange", "--color-ocean-soft", "--color-white", "--color-warning"];
// Shape mix: orange, ocean blue, white and a little warning-amber
const SHAPE_WEIGHTS = [0.42, 0.28, 0.22, 0.08];
const AMBIENT_WEIGHTS = [0.3, 0.34, 0.28, 0.08];

function pickColor(weights: number[]): number {
  let r = Math.random();
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return 0;
}

/** Draw the dumbbell on a small offscreen canvas and return sample points (0–1 space). */
function sampleDumbbell(step: number): Array<{ x: number; y: number; edge: boolean }> {
  const S = 400;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  };
  ctx.fillStyle = "black"; // mask only — never shown
  rr(36, 186, 328, 28, 10); // bar
  rr(30, 180, 14, 40, 5); // end caps
  rr(356, 180, 14, 40, 5);
  rr(50, 132, 30, 136, 10); // outer plates
  rr(320, 132, 30, 136, 10);
  rr(84, 96, 38, 208, 12); // big plates
  rr(278, 96, 38, 208, 12);
  rr(126, 170, 14, 60, 5); // collars
  rr(260, 170, 14, 60, 5);

  const data = ctx.getImageData(0, 0, S, S).data;
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < S && y < S && data[(Math.floor(y) * S + Math.floor(x)) * 4 + 3] > 128;

  const points: Array<{ x: number; y: number; edge: boolean }> = [];
  for (let y = step / 2; y < S; y += step) {
    for (let x = step / 2; x < S; x += step) {
      if (!inside(x, y)) continue;
      const edge = !inside(x + step, y) || !inside(x - step, y) || !inside(x, y + step) || !inside(x, y - step);
      // Outline always, interior thinned out — keeps the silhouette crisp and airy
      if (edge || Math.random() < 0.5) {
        points.push({
          x: (x + (Math.random() - 0.5) * step * 0.6) / S,
          y: (y + (Math.random() - 0.5) * step * 0.6) / S,
          edge,
        });
      }
    }
  }
  return points;
}

export function ParticleField({
  shape = "dumbbell",
  density = 1,
  ambient = 1,
  shapeOpacity = 0.95,
  interactive = true,
  anchorRef,
  placement = { x: 0.5, y: 0.5, size: 0.8 },
  tilt = -18,
  className,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const palette = PALETTE_VARS.map((v) => styles.getPropertyValue(v).trim() || "white");

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let last = 0;
    let time = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999, active: false };

    function layout() {
      const rect = host!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Where the shape goes, in canvas pixels
      let cx = width * placement.x;
      let cy = height * placement.y;
      let size = Math.min(width, height) * placement.size;
      const anchor = anchorRef?.current;
      if (anchor) {
        const a = anchor.getBoundingClientRect();
        cx = a.left - rect.left + a.width / 2;
        cy = a.top - rect.top + a.height / 2;
        size = Math.min(a.width * 1.05, a.height * 1.25);
      }

      // Denser grid for bigger shapes, capped so phones stay light
      const px = Math.max(6.5, 8.5 / Math.sqrt(Math.max(density, 0.05)));
      const step = Math.max(4, (px / size) * 400);
      const points = shape === "dumbbell" && size > 60 ? sampleDumbbell(step) : [];
      const angle = (tilt * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const shapeParticles: Particle[] = points.map((p, i) => {
        const lx = (p.x - 0.5) * size;
        const ly = (p.y - 0.5) * size;
        const prev = particles[i];
        return {
          x: prev && !prev.ambient ? prev.x : Math.random() * width,
          y: prev && !prev.ambient ? prev.y : Math.random() * height,
          vx: 0,
          vy: 0,
          tx: cx + lx * cos - ly * sin,
          ty: cy + lx * sin + ly * cos,
          size: (p.edge ? 3.2 : 2.6) + Math.random() * 2.6,
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.8,
          color: pickColor(SHAPE_WEIGHTS),
          alpha: shapeOpacity * (p.edge ? 1 : 0.7),
          phase: Math.random() * Math.PI * 2,
          delay: Math.random() * 0.9,
          ambient: false,
        };
      });

      const ambientCount = Math.round(((width * height) / 10000) * ambient);
      const ambientParticles: Particle[] = Array.from({ length: ambientCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        tx: (Math.random() - 0.5) * 10, // drift speed px/s
        ty: (Math.random() - 0.5) * 8,
        size: 2.2 + Math.random() * 3.6,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.5,
        color: pickColor(AMBIENT_WEIGHTS),
        alpha: 0.1 + Math.random() * 0.22,
        phase: Math.random() * Math.PI * 2,
        delay: 0,
        ambient: true,
      }));

      particles = [...shapeParticles, ...ambientParticles];

      if (reduced) {
        // Still image: everything already in place
        for (const p of particles) {
          if (!p.ambient) {
            p.x = p.tx;
            p.y = p.ty;
          }
        }
        draw();
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.lineWidth = 1.15;
      ctx!.lineJoin = "round";
      // Batch by colour and a few alpha levels: one stroke() per group keeps it cheap
      const groups = new Map<string, Particle[]>();
      for (const p of particles) {
        const key = `${p.color}|${Math.round(p.alpha * 8)}`;
        let list = groups.get(key);
        if (!list) groups.set(key, (list = []));
        list.push(p);
      }
      for (const [key, list] of groups) {
        const [color, alpha] = key.split("|").map(Number);
        ctx!.strokeStyle = palette[color];
        ctx!.globalAlpha = alpha / 8;
        ctx!.beginPath();
        for (const p of list) {
          const r = p.size;
          ctx!.moveTo(p.x + Math.cos(p.rot) * r, p.y + Math.sin(p.rot) * r);
          ctx!.lineTo(p.x + Math.cos(p.rot + 2.0944) * r, p.y + Math.sin(p.rot + 2.0944) * r);
          ctx!.lineTo(p.x + Math.cos(p.rot + 4.1888) * r, p.y + Math.sin(p.rot + 4.1888) * r);
          ctx!.closePath();
        }
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
    }

    function step(dt: number) {
      time += dt;
      const breathe = Math.sin(time * 0.45) * 5; // the whole shape floats up and down
      const repelRadius = 110;
      for (const p of particles) {
        p.rot += p.spin * dt;
        if (p.ambient) {
          p.x += p.tx * dt;
          p.y += p.ty * dt;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
          if (p.y < -10) p.y = height + 10;
          if (p.y > height + 10) p.y = -10;
          continue;
        }
        if (time < p.delay) continue;
        const gx = p.tx + Math.sin(time * 0.7 + p.phase) * 1.8;
        const gy = p.ty + breathe + Math.cos(time * 0.6 + p.phase * 1.3) * 1.8;
        // Spring toward the target
        let ax = (gx - p.x) * 7 - p.vx * 4.2;
        let ay = (gy - p.y) * 7 - p.vy * 4.2;
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < repelRadius * repelRadius && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = (1 - d / repelRadius) ** 2 * 1600;
            ax += (dx / d) * force;
            ay += (dy / d) * force;
          }
        }
        p.vx += ax * dt;
        p.vy += ay * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt);
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

    const resizeObserver = new ResizeObserver(() => {
      layout();
    });
    resizeObserver.observe(host);

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
        layout();
      } else {
        start();
      }
    };
    motionQuery.addEventListener("change", onMotionChange);

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive || reduced || e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onPointerLeave = () => {
      pointer.active = false;
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
    // Placement values are read once per layout; re-run only when the look changes
  }, [shape, density, ambient, shapeOpacity, interactive, tilt]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)} />;
}
