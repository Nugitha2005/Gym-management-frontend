import { add, clamp, dir, lerp, length, mix, reachFor, scale, sub, vec, type Vec } from "./geometry";

/*
 * The particle athlete's body.
 *
 * A figure is described in "figure units" (a standing athlete is about 95 units tall, the ground is y = 0
 * and y points down). A pose ("rig") is just a set of named joints. The body is drawn from parts —
 * tapered capsules between two joints, discs and weight plates — and every particle is tied to one part,
 * so when the joints move, the particles move with them and the silhouette stays sharp.
 */

export type Joints = Record<string, Vec>;

export interface Rig {
  joints: Joints;
  /** 1 = seen from the side (far limbs are dimmed), 0 = seen from the front. */
  side: number;
  /** Visibility (0–1) of named equipment groups, e.g. { machine: 1 }. Missing groups count as visible. */
  show?: Record<string, number>;
}

export type Layer = "far" | "body" | "prop";

export type Part =
  | { kind: "capsule"; a: string; b: string; ra: number; rb: number; layer: Layer; group?: string }
  | { kind: "disk"; c: string; r: number; layer: Layer; group?: string }
  | { kind: "plate"; c: string; r: number; layer: Layer; group?: string };

export const capsule = (a: string, b: string, ra: number, rb: number, layer: Layer, group?: string): Part => ({
  kind: "capsule",
  a,
  b,
  ra,
  rb,
  layer,
  group,
});
export const disk = (c: string, r: number, layer: Layer, group?: string): Part => ({ kind: "disk", c, r, layer, group });
export const plate = (c: string, r: number, layer: Layer, group?: string): Part => ({ kind: "plate", c, r, layer, group });

/** Bone lengths and body widths, in figure units. */
export const BONES = {
  torso: 31, // pelvis → base of the neck
  chest: 9, // how far below the neck the chest (top of the torso capsule) sits
  neck: 3.4,
  headR: 6.6,
  upperArm: 15.5,
  forearm: 14,
  thigh: 23,
  shin: 22,
  foot: 8,
  shoulderDrop: 3,
  shoulderHalf: 10.5, // half the shoulder width, front view
  hipHalf: 4.8,
  waistHalf: 4.5, // where the lats meet the waist, front view
};

/** Ankle height above the ground when standing. */
export const ANKLE = -2.4;

/**
 * The athlete, listed back to front. "far" parts are the arm and leg on the far side of the body;
 * they are dimmed in side views. A deep chest, lats that taper to the waist (the V shape from the front),
 * big shoulders and thick thighs give the muscular build.
 */
export const BODY_PARTS: Part[] = [
  capsule("shoulderF", "elbowF", 5.6, 4.2, "far"),
  capsule("elbowF", "handF", 4.2, 2.6, "far"),
  disk("shoulderF", 6.0, "far"),
  capsule("hipF", "kneeF", 6.6, 4.9, "far"),
  capsule("kneeF", "ankleF", 4.9, 2.9, "far"),
  capsule("ankleF", "toeF", 2.5, 1.7, "far"),
  capsule("shoulderF", "latF", 6.2, 4.4, "body"),
  capsule("shoulderN", "latN", 6.2, 4.4, "body"),
  capsule("neckBase", "shoulderF", 3.4, 3.4, "body"),
  capsule("neckBase", "shoulderN", 3.4, 3.4, "body"),
  capsule("chest", "pelvis", 11, 7.4, "body"),
  capsule("neck", "head", 3.6, 3.6, "body"),
  disk("head", BONES.headR, "body"),
  capsule("hipN", "kneeN", 6.6, 4.9, "body"),
  capsule("kneeN", "ankleN", 4.9, 2.9, "body"),
  capsule("ankleN", "toeN", 2.5, 1.7, "body"),
  disk("shoulderN", 6.2, "body"),
  capsule("shoulderN", "elbowN", 5.8, 4.3, "body"),
  capsule("elbowN", "handN", 4.3, 2.7, "body"),
];

/** A limb is given either as two absolute angles (upper, lower) or as a target to reach. */
export type Limb = { angles: [number, number] } | { to: Vec; bend: 1 | -1 };

export interface BodySpec {
  pelvis: Vec;
  /** Direction from the pelvis to the neck, in degrees (-90 = upright). */
  torso: number;
  /** Direction from the neck to the head (defaults to the torso direction). */
  head?: number;
  /** 1 = side view, 0 = front view. */
  side?: number;
  /** Near arm and leg (front view: the ones on the left of the screen). */
  armN: Limb;
  armF: Limb;
  legN: Limb;
  legF: Limb;
  footN?: number;
  footF?: number;
  /** Shorter thighs or shins for foreshortening (e.g. seated, seen from the front). */
  thigh?: number;
  shin?: number;
}

function solveLimb(root: Vec, limb: Limb, l1: number, l2: number): [Vec, Vec] {
  if ("to" in limb) return reachFor(root, limb.to, l1, l2, limb.bend);
  const mid = add(root, scale(dir(limb.angles[0]), l1));
  return [mid, add(mid, scale(dir(limb.angles[1]), l2))];
}

/** Build every body joint from a compact pose description (forward kinematics + IK for reaching limbs). */
export function body(spec: BodySpec): Joints {
  const side = spec.side ?? 1;
  const up = dir(spec.torso);
  const back = dir(spec.torso - 90);
  const across = dir(spec.torso + 90);

  const neck = add(spec.pelvis, scale(up, BONES.torso));
  const neckBase = add(neck, scale(up, -1));
  const chest = add(neck, scale(up, -BONES.chest));
  const shoulderLine = add(neck, scale(up, -BONES.shoulderDrop));
  const head = add(neck, scale(dir(spec.head ?? spec.torso), BONES.neck + BONES.headR));

  // Front view: shoulders and hips spread left/right. Side view: the far side sits just behind.
  const shoulderN = add(shoulderLine, mix(scale(across, -BONES.shoulderHalf), vec(0, 0), side));
  const shoulderF = add(shoulderLine, mix(scale(across, BONES.shoulderHalf), scale(back, 1.6), side));
  const hipN = add(spec.pelvis, mix(scale(across, -BONES.hipHalf), vec(0, 0), side));
  const hipF = add(spec.pelvis, mix(scale(across, BONES.hipHalf), scale(back, 1.2), side));
  // The lats run from the shoulders to the sides of the waist (inside the torso when seen from the side)
  const waist = add(spec.pelvis, scale(up, 9));
  const latN = add(waist, mix(scale(across, -BONES.waistHalf), vec(0, 0), side));
  const latF = add(waist, mix(scale(across, BONES.waistHalf), vec(0, 0), side));

  const [elbowN, handN] = solveLimb(shoulderN, spec.armN, BONES.upperArm, BONES.forearm);
  const [elbowF, handF] = solveLimb(shoulderF, spec.armF, BONES.upperArm, BONES.forearm);
  const thigh = spec.thigh ?? BONES.thigh;
  const shin = spec.shin ?? BONES.shin;
  const [kneeN, ankleN] = solveLimb(hipN, spec.legN, thigh, shin);
  const [kneeF, ankleF] = solveLimb(hipF, spec.legF, thigh, shin);

  // Feet point forward in side view; in front view they are short and turned out.
  const footLength = lerp(4.5, BONES.foot, side);
  const toeN = add(ankleN, scale(dir(spec.footN ?? lerp(150, 0, side)), footLength));
  const toeF = add(ankleF, scale(dir(spec.footF ?? lerp(30, 0, side)), footLength));

  return {
    pelvis: spec.pelvis,
    chest,
    neck,
    neckBase,
    head,
    shoulderN,
    shoulderF,
    elbowN,
    elbowF,
    handN,
    handF,
    hipN,
    hipF,
    latN,
    latF,
    kneeN,
    kneeF,
    ankleN,
    ankleF,
    toeN,
    toeF,
  };
}

/** Blend two poses. Joints missing on one side fall back to that pose's pelvis. */
export function mixRig(a: Rig, b: Rig, t: number): Rig {
  const joints: Joints = {};
  for (const name of new Set([...Object.keys(a.joints), ...Object.keys(b.joints)])) {
    joints[name] = mix(a.joints[name] ?? a.joints.pelvis, b.joints[name] ?? b.joints.pelvis, t);
  }
  const show: Record<string, number> = {};
  for (const name of new Set([...Object.keys(a.show ?? {}), ...Object.keys(b.show ?? {})])) {
    show[name] = lerp(a.show?.[name] ?? 1, b.show?.[name] ?? 1, t);
  }
  return { joints, side: lerp(a.side, b.side, t), show };
}

/** Mirror a pose left ↔ right (e.g. to run the other way). */
export function mirrorRig(rig: Rig): Rig {
  const joints: Joints = {};
  for (const [name, p] of Object.entries(rig.joints)) joints[name] = { x: -p.x, y: p.y };
  return { ...rig, joints };
}

// ---------------------------------------------------------------------------------------------
// Sampling: turn parts into particle positions ("bindings") that follow the joints.
// ---------------------------------------------------------------------------------------------

/**
 * Where one particle sits on its part. For a capsule: `u` is the fraction of the way from joint a to b,
 * `e` an extra distance along the bone (used by the rounded ends) and `w` the distance across it,
 * both in figure units. For discs and plates, (e, w) is the offset from the centre.
 */
export interface Binding {
  part: number;
  u: number;
  e: number;
  w: number;
  edge: boolean;
}

const jitter = (amount: number) => (Math.random() - 0.5) * amount;

function sampleCapsule(index: number, part: Extract<Part, { kind: "capsule" }>, joints: Joints, sp: number, fill: number): Binding[] {
  const a = joints[part.a] ?? joints.pelvis;
  const b = joints[part.b] ?? joints.pelvis;
  const len = Math.max(0.001, length(sub(b, a)));
  const out: Binding[] = [];

  // Thin rods (cables, bars) become a single dotted line
  if (Math.max(part.ra, part.rb) < sp * 0.55) {
    const n = Math.max(1, Math.round(len / sp));
    for (let k = 0; k <= n; k++) out.push({ part: index, u: k / n, e: 0, w: 0, edge: true });
    return out;
  }

  // Both sides of the capsule
  const n = Math.max(2, Math.round(len / sp));
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const r = lerp(part.ra, part.rb, u);
    out.push({ part: index, u, e: jitter(sp * 0.25), w: r + jitter(sp * 0.12), edge: true });
    out.push({ part: index, u, e: jitter(sp * 0.25), w: -r + jitter(sp * 0.12), edge: true });
  }

  // Rounded ends: a half circle behind joint a and one beyond joint b
  const cap = (r: number, from: number, to: number, u: number) => {
    const steps = Math.max(1, Math.round((Math.PI * r) / sp));
    for (let k = 1; k < steps; k++) {
      const t = ((from + ((to - from) * k) / steps) * Math.PI) / 180;
      out.push({ part: index, u, e: r * Math.cos(t), w: r * Math.sin(t), edge: true });
    }
  };
  cap(part.ra, 90, 270, 0);
  cap(part.rb, -90, 90, 1);

  // Sparse inside fill
  const inner = sp * 1.35;
  for (let x = inner / 2; x < len; x += inner) {
    const u = x / len;
    const r = lerp(part.ra, part.rb, u) - sp * 0.7;
    for (let w = -r; w <= r; w += inner) {
      if (Math.random() < fill) out.push({ part: index, u, e: jitter(inner * 0.5), w: w + jitter(inner * 0.5), edge: false });
    }
  }
  return out;
}

function sampleRound(index: number, part: Extract<Part, { kind: "disk" | "plate" }>, sp: number, fill: number): Binding[] {
  const out: Binding[] = [];
  const circle = (r: number, keep = 1) => {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / sp));
    const offset = Math.random() * Math.PI * 2;
    for (let k = 0; k < n; k++) {
      if (Math.random() > keep) continue;
      const t = offset + (k / n) * Math.PI * 2;
      out.push({ part: index, u: 0, e: r * Math.cos(t), w: r * Math.sin(t), edge: true });
    }
  };
  circle(part.r);
  if (part.kind === "plate") {
    // A weight plate from the side: outer rim, inner lip and the hub
    circle(part.r * 0.78, 0.7);
    circle(Math.max(part.r * 0.24, sp * 0.6));
  }
  const inner = sp * 1.35;
  const density = part.kind === "plate" ? fill * 0.5 : fill;
  for (let x = -part.r; x <= part.r; x += inner) {
    for (let y = -part.r; y <= part.r; y += inner) {
      if (x * x + y * y < (part.r - sp * 0.7) ** 2 && Math.random() < density) {
        out.push({ part: index, u: 0, e: x + jitter(inner * 0.5), w: y + jitter(inner * 0.5), edge: false });
      }
    }
  }
  return out;
}

/** Position of a binding, written into `out`. `joints` must already be in the output space; `s` = units → output. */
export function locate(binding: Binding, part: Part, joints: Joints, s: number, out: Vec): void {
  if (part.kind === "capsule") {
    const a = joints[part.a] ?? joints.pelvis;
    const b = joints[part.b] ?? joints.pelvis;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len > 1e-6) {
      dx /= len;
      dy /= len;
    } else {
      dx = 1;
      dy = 0;
    }
    const along = binding.u * len + binding.e * s;
    const across = binding.w * s;
    out.x = a.x + dx * along - dy * across;
    out.y = a.y + dy * along + dx * across;
  } else {
    const c = joints[part.c] ?? joints.pelvis;
    out.x = c.x + binding.e * s;
    out.y = c.y + binding.w * s;
  }
}

/** Is a point (figure units) inside a part, by at least `margin`? */
function inside(p: Vec, part: Part, joints: Joints, margin: number): boolean {
  if (part.kind === "capsule") {
    const a = joints[part.a] ?? joints.pelvis;
    const b = joints[part.b] ?? joints.pelvis;
    const ab = sub(b, a);
    const len2 = ab.x * ab.x + ab.y * ab.y || 1;
    const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2);
    const r = lerp(part.ra, part.rb, t) - margin;
    return r > 0 && length(sub(p, add(a, scale(ab, t)))) < r;
  }
  const c = joints[part.c] ?? joints.pelvis;
  return part.r - margin > 0 && length(sub(p, c)) < part.r - margin;
}

/**
 * Sample every part into bindings (spacing `sp` in figure units, measured on the reference pose).
 * Outline points that end up hidden under a part drawn in front are thinned out and dimmed,
 * so only the real silhouette is outlined. Parts only hide each other when they are both plain
 * body/equipment parts or belong to the same equipment group.
 */
export function sampleParts(parts: Part[], reference: Rig, sp: number, fill = 0.3): Binding[] {
  const all: Binding[] = [];
  const probe = { x: 0, y: 0 };
  parts.forEach((part, i) => {
    const bindings = part.kind === "capsule" ? sampleCapsule(i, part, reference.joints, sp, fill) : sampleRound(i, part, sp, fill);
    for (const b of bindings) {
      locate(b, part, reference.joints, 1, probe);
      let covered = false;
      for (let j = i + 1; j < parts.length && !covered; j++) {
        const other = parts[j];
        if (other.group !== part.group) continue;
        covered = inside(probe, other, reference.joints, sp * 0.45);
      }
      if (!covered) {
        all.push(b);
      } else if (Math.random() < (b.edge ? 0.3 : 0.2)) {
        all.push({ ...b, edge: false });
      }
    }
  });
  return all;
}

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Box around a set of poses, padded by `margin` figure units (for the widest part). */
export function measure(rigs: Rig[], margin = 11): Bounds {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const rig of rigs) {
    for (const p of Object.values(rig.joints)) {
      box.x0 = Math.min(box.x0, p.x);
      box.y0 = Math.min(box.y0, p.y);
      box.x1 = Math.max(box.x1, p.x);
      box.y1 = Math.max(box.y1, p.y);
    }
  }
  return { x0: box.x0 - margin, y0: box.y0 - margin, x1: box.x1 + margin, y1: Math.max(box.y1 + 2, 1) };
}
