import { MotionControl } from "./control";
import { pickColor, type Box, type Particle, type ParticleScene } from "./engine";
import { clamp, easeOut, lerp, random, type Vec } from "./geometry";
import { workoutTrackMotion, type Exercise, type Motion, type TrackState } from "./poses";
import { sampleDumbbell } from "./shapes";
import { locate, sampleParts, type Binding, type Joints } from "./skeleton";

/*
 * Scenes decide where every particle should be each frame; the engine does the physics and drawing.
 *
 *   AthleteScene  — a particle athlete doing an exercise (hero, login, register, the landing-page runner).
 *                   Optional intro: particles first fly in and form the dumbbell, which then dissolves
 *                   into the athlete.
 *   DumbbellScene — the original still dumbbell.
 *   EmptyScene    — nothing but the engine's ambient triangles.
 */

interface FigureParticle extends Particle {
  bind: Binding;
  /** Opacity before layer and equipment fading: outline 1, inside 0.5. */
  base: number;
  phase: number;
  /** When the particle starts flying in. */
  delay: number;
  /** When the particle joins the athlete (after the dumbbell intro). */
  start: number;
  /** Its spot in the intro dumbbell, or null without that intro. */
  intro: Vec | null;
  /** Part of the visible dumbbell (the rest hide inside it until the athlete forms). */
  introShown: boolean;
  /** On the dumbbell's outline (drawn brighter than its inside). */
  introEdge: boolean;
}

// Outline mostly orange and white, inside mostly blue and dimmer, equipment blue/white — keeps the body readable
const COLOR_WEIGHTS = {
  edge: [0.5, 0.1, 0.35, 0.05],
  fill: [0.26, 0.42, 0.28, 0.04],
  prop: [0.12, 0.5, 0.38, 0],
};

const STIFFNESS = 38; // holds the shape tightly once formed
const DUMBBELL_HOLD = 2.5; // seconds before the intro dumbbell starts turning into the athlete
const MORPH_SPREAD = 1.0; // seconds over which the morph ripples out from the centre
const GATHER_SPREAD = 0.9; // seconds over which particles set off in the plain intro

export interface Placement {
  /** Canvas position of the figure's origin (feet level, x = 0). */
  ox: number;
  oy: number;
  /** Pixels per figure unit. */
  s: number;
}

export interface AthleteSceneOptions {
  motion: Motion;
  /** Distance between outline particles, px. Smaller = more, finer particles. */
  spacing: number;
  opacity?: number;
  /** Share of the available box the figure fills. */
  fit?: number;
  maxParticles?: number;
  /** Triangle size range, px. */
  sizeRange?: [number, number];
  intro?: "dumbbell" | "gather";
  /** Tilt of the intro dumbbell, degrees. */
  tilt?: number;
  control?: MotionControl;
  /** Box (fractions of the canvas, centre + size) to fit into when there is no anchor element. */
  box?: { x: number; y: number; w: number; h: number };
  /** Custom placement instead of fitting into a box. */
  place?: (width: number, height: number) => Placement;
  /** Called every frame; may move the figure sideways or fade it (used by the landing-page runner). */
  follow?: (dt: number, width: number, s: number) => { ox?: number; opacity?: number };
}

export class AthleteScene implements ParticleScene {
  particles: FigureParticle[] = [];
  readonly stillTime: number;
  private placement: Placement = { ox: 0, oy: 0, s: 0 };
  private width = 0;
  private clock = 0;
  private readonly clockStart: number;
  private readonly probe: Vec = { x: 0, y: 0 };

  constructor(private readonly options: AthleteSceneOptions) {
    this.clockStart = options.intro === "dumbbell" ? DUMBBELL_HOLD + MORPH_SPREAD + 0.3 : 0.3;
    this.stillTime = this.clockStart + options.motion.stillTime;
  }

  layout(width: number, height: number, anchor: Box | null): void {
    this.width = width;
    const next = this.options.place ? this.options.place(width, height) : this.fitInto(width, height, anchor);
    const resized = this.particles.length === 0 || Math.abs(next.s - this.placement.s) > this.placement.s * 0.03;
    this.placement = next;
    if (resized) this.build(width, height, anchor);
  }

  private fitInto(width: number, height: number, anchor: Box | null): Placement {
    const { bounds } = this.options.motion;
    const b = this.options.box;
    const box =
      anchor ??
      (b
        ? { x: width * (b.x - b.w / 2), y: height * (b.y - b.h / 2), width: width * b.w, height: height * b.h }
        : { x: 0, y: 0, width, height });
    const s = Math.min(box.width / (bounds.x1 - bounds.x0), box.height / (bounds.y1 - bounds.y0)) * (this.options.fit ?? 0.92);
    return {
      ox: box.x + box.width / 2 - ((bounds.x0 + bounds.x1) / 2) * s,
      oy: box.y + box.height / 2 - ((bounds.y0 + bounds.y1) / 2) * s,
      s,
    };
  }

  /** Sample the athlete into particles (keeping the previous particles' positions where possible). */
  private build(width: number, height: number, anchor: Box | null) {
    const { motion } = this.options;
    const s = this.placement.s;
    if (!(s > 0)) return;

    const max = this.options.maxParticles ?? 1600;
    let spacing = this.options.spacing;
    let binds = sampleParts(motion.parts, motion.reference, spacing / s);
    for (let i = 0; i < 3 && binds.length > max; i++) {
      spacing *= Math.sqrt(binds.length / max) * 1.05;
      binds = sampleParts(motion.parts, motion.reference, spacing / s);
    }

    const [minSize, maxSize] = this.options.sizeRange ?? [1.3, 2.4];
    const previous = this.particles;
    this.particles = binds.map((bind, i): FigureParticle => {
      const prop = motion.parts[bind.part].layer === "prop";
      const prev = previous[i];
      return {
        x: prev?.x ?? Math.random() * width,
        y: prev?.y ?? Math.random() * height,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        size: random(minSize, maxSize) * (bind.edge ? 1 : 0.85),
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.8,
        color: pickColor(prop ? COLOR_WEIGHTS.prop : bind.edge ? COLOR_WEIGHTS.edge : COLOR_WEIGHTS.fill),
        alpha: 0,
        k: 6,
        active: false,
        bind,
        base: bind.edge ? 1 : 0.5,
        phase: Math.random() * Math.PI * 2,
        delay: prev?.delay ?? Math.random() * GATHER_SPREAD,
        start: prev?.start ?? Math.random() * GATHER_SPREAD,
        intro: prev?.intro ?? null,
        introShown: prev?.introShown ?? false,
        introEdge: prev?.introEdge ?? false,
      };
    });

    if (this.options.intro === "dumbbell" && previous.length === 0) this.formDumbbell(width, height, anchor);
  }

  /** Give every particle a spot in the intro dumbbell; the athlete forms from its centre outwards. */
  private formDumbbell(width: number, height: number, anchor: Box | null) {
    const box = anchor ?? { x: 0, y: 0, width, height };
    const size = Math.min(box.width * 1.05, box.height * 1.25) * 0.9;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const want = Math.min(this.particles.length, 750);
    let points = sampleDumbbell(8, 0.22);
    if (points.length === 0) return;
    points = sampleDumbbell(Math.max(3, 8 * Math.sqrt(points.length / want)), 0.22);
    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }
    const angle = ((this.options.tilt ?? -18) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.particles.forEach((p, i) => {
      const pt = points[i % points.length];
      const lx = (pt.x - 0.5) * size;
      const ly = (pt.y - 0.5) * size;
      p.intro = { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
      p.introShown = i < points.length;
      p.introEdge = pt.edge;
      if (!p.introShown) {
        p.x = p.intro.x;
        p.y = p.intro.y;
      }
      const fromCentre = clamp(Math.hypot(p.intro.x - cx, p.intro.y - cy) / (size / 2));
      p.start = DUMBBELL_HOLD + fromCentre * MORPH_SPREAD * 0.7 + Math.random() * MORPH_SPREAD * 0.3;
    });
  }

  update(time: number, dt: number): void {
    const { motion, control, follow } = this.options;
    const still = dt === 0;
    control?.tick(dt);

    // 1. Advance the exercise clock (typing on the login/register form speeds it up)
    if (still) this.clock = motion.stillTime;
    else if (time > this.clockStart) this.clock += dt * (control?.tempo ?? 1);

    // 2. Let the landing-page runner move sideways / fade
    const followed = follow?.(dt, this.width, this.placement.s);
    if (followed?.ox !== undefined) this.placement.ox = followed.ox;
    const opacity = (this.options.opacity ?? 0.95) * (followed?.opacity ?? 1);

    // 3. Pose → joints in canvas pixels
    const rig = motion.pose(this.clock, dt, control);
    const { ox, oy, s } = this.placement;
    const joints: Joints = {};
    for (const name in rig.joints) {
      const j = rig.joints[name];
      joints[name] = { x: ox + j.x * s, y: oy + j.y * s };
    }
    const pelvis = joints.pelvis;
    const farAlpha = lerp(1, 0.5, rig.side);

    // 4. Every particle follows its spot on the body (or its spot in the intro dumbbell)
    for (const p of this.particles) {
      const part = motion.parts[p.bind.part];
      locate(p.bind, part, joints, s, this.probe);
      let x = this.probe.x;
      let y = this.probe.y;
      let alpha = p.base * opacity * (part.layer === "far" ? farAlpha : part.layer === "prop" ? 0.9 : 1);
      if (part.group) {
        // Equipment that isn't in use folds into the athlete's hips and fades out
        const shown = rig.show?.[part.group] ?? 1;
        if (shown < 1) {
          const e = easeOut(shown);
          x = lerp(pelvis.x, x, e);
          y = lerp(pelvis.y, y, e);
          alpha *= shown;
        }
      }
      // A gentle shimmer so the figure feels alive
      x += Math.sin(time * 0.9 + p.phase) * 0.45;
      y += Math.cos(time * 0.8 + p.phase * 1.3) * 0.45;

      const since = still ? Infinity : time - p.start;
      if (since >= 0) {
        p.tx = x;
        p.ty = y;
        p.alpha = alpha * (p.intro && !p.introShown ? clamp(since / 0.7) : 1);
        p.k = still ? STIFFNESS : lerp(6, STIFFNESS, easeOut(since / 1.4));
        p.active = true;
      } else if (p.intro) {
        // Intro: part of the floating dumbbell, or hidden inside it until the morph
        p.tx = p.intro.x + Math.sin(time * 0.7 + p.phase) * 1.8;
        p.ty = p.intro.y + Math.sin(time * 0.45) * 5 + Math.cos(time * 0.6 + p.phase * 1.3) * 1.8;
        p.alpha = p.introShown ? opacity * (p.introEdge ? 1 : 0.45) : 0;
        p.k = 7;
        p.active = time >= p.delay;
      } else {
        // Plain intro: waiting at the random start position, then flying in
        p.tx = x;
        p.ty = y;
        p.alpha = alpha * 0.6;
        p.active = false;
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------

interface DumbbellParticle extends Particle {
  hx: number;
  hy: number;
  phase: number;
  delay: number;
}

export interface DumbbellOptions {
  density: number;
  opacity: number;
  tilt: number;
  placement: { x: number; y: number; size: number };
}

/** The original still dumbbell: particles fly in, then float with it. */
export class DumbbellScene implements ParticleScene {
  particles: DumbbellParticle[] = [];
  readonly stillTime = 10;

  constructor(private readonly o: DumbbellOptions) {}

  layout(width: number, height: number, anchor: Box | null): void {
    let cx = width * this.o.placement.x;
    let cy = height * this.o.placement.y;
    let size = Math.min(width, height) * this.o.placement.size;
    if (anchor) {
      cx = anchor.x + anchor.width / 2;
      cy = anchor.y + anchor.height / 2;
      size = Math.min(anchor.width * 1.05, anchor.height * 1.25);
    }
    const px = Math.max(5.5, 7 / Math.sqrt(Math.max(this.o.density, 0.05)));
    const points = size > 60 ? sampleDumbbell(Math.max(4, (px / size) * 400)) : [];
    const angle = (this.o.tilt * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const previous = this.particles;
    this.particles = points.map((pt, i) => {
      const lx = (pt.x - 0.5) * size;
      const ly = (pt.y - 0.5) * size;
      return {
        x: previous[i]?.x ?? Math.random() * width,
        y: previous[i]?.y ?? Math.random() * height,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        hx: cx + lx * cos - ly * sin,
        hy: cy + lx * sin + ly * cos,
        size: (pt.edge ? 1.6 : 1.3) + Math.random() * 1.1,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.8,
        color: pickColor([0.42, 0.28, 0.22, 0.08]),
        alpha: this.o.opacity * (pt.edge ? 1 : 0.7),
        k: 7,
        active: false,
        phase: Math.random() * Math.PI * 2,
        delay: Math.random() * 0.9,
      };
    });
  }

  update(time: number): void {
    const breathe = Math.sin(time * 0.45) * 5;
    for (const p of this.particles) {
      p.active = time >= p.delay;
      p.tx = p.hx + Math.sin(time * 0.7 + p.phase) * 1.8;
      p.ty = p.hy + breathe + Math.cos(time * 0.6 + p.phase * 1.3) * 1.8;
    }
  }
}

/** Only the engine's ambient triangles. */
export class EmptyScene implements ParticleScene {
  readonly particles: Particle[] = [];
  readonly stillTime = 0;
  layout(): void {}
  update(): void {}
}

// ---------------------------------------------------------------------------------------------

/** Written by the landing page on scroll, read by the runner every frame. */
export interface TrackInput {
  /** 0 = left edge, 1 = right edge: how far down the page the reader is. */
  target: number;
  /** Exercise of the section in view. */
  exercise: Exercise;
  visible: boolean;
  /** performance.now() of the last scroll event. */
  lastScroll: number;
}

const TRACK_MARGIN = 96;

/**
 * The athlete who runs along the bottom of the landing page. While the reader scrolls he runs to keep up
 * (and turns round when they scroll back up); when they stop, he does the exercise of that section.
 */
export function createTrackScene(input: TrackInput): AthleteScene {
  const state: TrackState = { exercise: input.exercise, moving: false, facing: 1, runPhase: 0 };
  let pos = input.target;
  let opacity = 0;
  let stillFor = 1;

  return new AthleteScene({
    motion: workoutTrackMotion(state),
    spacing: 3.3,
    sizeRange: [1, 1.8],
    opacity: 0.9,
    intro: "gather",
    maxParticles: 900,
    place: (_width, height) => ({ ox: TRACK_MARGIN, oy: height - 10, s: (height - 18) / 124 }),
    follow: (dt, width, s) => {
      const travel = Math.max(0, width - TRACK_MARGIN * 2);
      const before = pos;
      pos += (input.target - pos) * (1 - Math.exp(-5 * dt));
      const dx = (pos - before) * travel;
      const behind = Math.abs(input.target - pos) * travel;
      const scrolling = performance.now() - input.lastScroll < 200;

      // Keep running for a moment after the last movement so short pauses don't flicker
      if (behind > 2 || (scrolling && Math.abs(dx) > 0.02)) stillFor = 0;
      else stillFor += dt;
      state.moving = stillFor < 0.3;
      if (dx > 0.2) state.facing = 1;
      else if (dx < -0.2) state.facing = -1;
      if (!state.moving) state.facing = 1;
      state.runPhase += Math.abs(dx) / (s * 90) + (state.moving ? dt * 0.3 : 0);
      state.exercise = input.exercise;

      opacity += ((input.visible ? 1 : 0) - opacity) * (1 - Math.exp(-4 * dt));
      return { ox: TRACK_MARGIN + pos * travel, opacity };
    },
  });
}
