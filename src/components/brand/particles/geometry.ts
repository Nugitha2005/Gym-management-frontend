/*
 * Small 2D maths helpers for the particle athletes.
 * Angles are in degrees in screen space: 0° points right, 90° points down, -90° points up.
 */

export interface Vec {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const length = (a: Vec): number => Math.hypot(a.x, a.y);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const mix = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
export const random = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

/** Unit vector pointing at `deg` degrees (screen space). */
export function dir(deg: number): Vec {
  const r = (deg * Math.PI) / 180;
  return { x: Math.cos(r), y: Math.sin(r) };
}

/** Angle of a vector in degrees (screen space). */
export function angleOf(v: Vec): number {
  return (Math.atan2(v.y, v.x) * 180) / Math.PI;
}

/** Smooth start and stop, 0 → 1. */
export const easeInOut = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
/** Fast start, soft landing, 0 → 1. */
export const easeOut = (t: number): number => 1 - (1 - clamp(t)) ** 3;

/**
 * Two-bone inverse kinematics: place an elbow (or knee) so that a limb of lengths l1 + l2
 * starting at `root` reaches `target`. `bend` picks which side the joint bends to.
 * Returns [middle joint, end joint]. An out-of-reach target gives a straight limb pointing at it.
 */
export function reachFor(root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1): [Vec, Vec] {
  const toTarget = sub(target, root);
  const d = clamp(length(toTarget), Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.01);
  const base = Math.atan2(toTarget.y, toTarget.x);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a = base + bend * Math.acos(cosA);
  const mid = { x: root.x + Math.cos(a) * l1, y: root.y + Math.sin(a) * l1 };
  const toEnd = sub(target, mid);
  const endLength = length(toEnd) || 1;
  return [mid, add(mid, scale(toEnd, l2 / endLength))];
}

/**
 * How one repetition is split in time (fractions of the cycle, adding up to 1):
 * pause at the top, lower, pause at the bottom, lift.
 */
export interface RepShape {
  top: number;
  down: number;
  bottom: number;
  up: number;
}

export const STANDARD_REP: RepShape = { top: 0.2, down: 0.34, bottom: 0.08, up: 0.38 };

/** Depth of a repetition (0 = top position, 1 = bottom position) at a point in the cycle. */
export function repDepth(cycle: number, shape: RepShape = STANDARD_REP): number {
  let x = cycle - Math.floor(cycle);
  if (x < shape.top) return 0;
  x -= shape.top;
  if (x < shape.down) return easeInOut(x / shape.down);
  x -= shape.down;
  if (x < shape.bottom) return 1;
  x -= shape.bottom;
  return 1 - easeInOut(x / shape.up);
}
