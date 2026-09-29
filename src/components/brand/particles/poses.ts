import { MotionControl, RepDriver } from "./control";
import { add, angleOf, clamp, dir, easeInOut, lerp, mix, repDepth, scale, sub, vec, type Vec } from "./geometry";
import {
  ANKLE,
  BODY_PARTS,
  BONES,
  body,
  capsule,
  disk,
  measure,
  mirrorRig,
  mixRig,
  plate,
  type Bounds,
  type Joints,
  type Part,
  type Rig,
} from "./skeleton";

/*
 * The exercises. Every `...Rig` function is a pure pose: give it how far into the movement the athlete is
 * (p = 0 top, 1 bottom) or the time, and it returns the joints in figure units (feet on y = 0, facing right).
 * A Motion wraps a pose with its equipment, the box it needs and a clock.
 */

export interface Motion {
  parts: Part[];
  /** Box the whole movement fits in, in figure units. */
  bounds: Bounds;
  /** Pose used to decide which outline points are hidden behind other parts. */
  reference: Rig;
  /** Motion time shown as a single still frame when the user prefers reduced motion. */
  stillTime: number;
  pose(t: number, dt: number, control?: MotionControl): Rig;
}

const RAD = Math.PI / 180;

// ---------------------------------------------------------------------------------------------
// Barbell back squat (side view)
// ---------------------------------------------------------------------------------------------

export function squatRig(p: number): Rig {
  const pelvis = mix(vec(-1.5, -44), vec(-16, -21.5), p);
  const torso = lerp(-84, -48, p);
  const up = dir(torso);
  const back = dir(torso - 90);
  const forward = dir(torso + 90);
  const neck = add(pelvis, scale(up, BONES.torso));
  // The bar rests on the upper back; the hands hold it just in front
  const bar = add(add(neck, scale(up, -4)), scale(back, 6));
  const grip = add(bar, scale(forward, 2.5));
  const joints = body({
    pelvis,
    torso,
    head: lerp(-86, -66, p),
    armN: { to: grip, bend: -1 },
    armF: { to: add(grip, scale(up, 0.8)), bend: -1 },
    legN: { to: vec(0.8, ANKLE), bend: -1 },
    legF: { to: vec(-0.8, ANKLE - 0.3), bend: -1 },
  });
  joints.bar = bar;
  return { joints, side: 1 };
}

// The weight plate is drawn behind the athlete so it never hides the body
const squatBar = (group?: string): Part[] => [plate("bar", 9.5, "prop", group)];

/**
 * Barbell back squat seen from the front: the bar across the shoulders with plates on both ends.
 * The thighs point towards the viewer at the bottom, so they are drawn shorter (foreshortening).
 */
export function frontSquatRig(p: number): Rig {
  const pelvis = vec(0, lerp(-45.4, -26, p));
  const neckY = pelvis.y - BONES.torso;
  const barY = neckY + 3.2;
  const joints = body({
    pelvis,
    torso: -90,
    head: -90,
    side: 0,
    armN: { to: vec(-17.5, barY), bend: -1 },
    armF: { to: vec(17.5, barY), bend: 1 },
    legN: { to: vec(-11, ANKLE), bend: 1 },
    legF: { to: vec(11, ANKLE), bend: -1 },
    thigh: lerp(BONES.thigh, 13, p),
  });
  Object.assign(joints, {
    barL: vec(-46, barY),
    barR: vec(46, barY),
    plateL1: vec(-31, barY - 11.5),
    plateL2: vec(-31, barY + 11.5),
    plateR1: vec(31, barY - 11.5),
    plateR2: vec(31, barY + 11.5),
    smallL1: vec(-37, barY - 8),
    smallL2: vec(-37, barY + 8),
    smallR1: vec(37, barY - 8),
    smallR2: vec(37, barY + 8),
    collarL1: vec(-25.5, barY - 3),
    collarL2: vec(-25.5, barY + 3),
    collarR1: vec(25.5, barY - 3),
    collarR2: vec(25.5, barY + 3),
  });
  return { joints, side: 0 };
}

const FRONT_BARBELL: Part[] = [
  capsule("barL", "barR", 1.3, 1.3, "prop"),
  capsule("plateL1", "plateL2", 3.3, 3.3, "prop"),
  capsule("plateR1", "plateR2", 3.3, 3.3, "prop"),
  capsule("smallL1", "smallL2", 2.6, 2.6, "prop"),
  capsule("smallR1", "smallR2", 2.6, 2.6, "prop"),
  capsule("collarL1", "collarL2", 1.6, 1.6, "prop"),
  capsule("collarR1", "collarR2", 1.6, 1.6, "prop"),
];

export function squatMotion(): Motion {
  const reps = new RepDriver(3.8);
  return {
    parts: [...BODY_PARTS, ...FRONT_BARBELL],
    bounds: measure([0, 0.5, 1].map(frontSquatRig), 6),
    reference: frontSquatRig(0),
    stillTime: 0.2,
    pose: (t, dt, control) => frontSquatRig(reps.next(t, dt, control).p),
  };
}

// ---------------------------------------------------------------------------------------------
// Bench press (side view, lying on a flat bench)
// ---------------------------------------------------------------------------------------------

const BENCH_JOINTS: Joints = {
  benchHead: vec(-46, -15.5),
  benchTail: vec(18, -15.5),
  legA0: vec(-38, 0),
  legA1: vec(-38, -15),
  legB0: vec(11, 0),
  legB1: vec(11, -15),
  footA0: vec(-43, 0),
  footA1: vec(-33, 0),
  footB0: vec(6, 0),
  footB1: vec(16, 0),
};

const BENCH_PARTS: Part[] = [
  capsule("legA0", "legA1", 1.4, 1.4, "prop"),
  capsule("legB0", "legB1", 1.4, 1.4, "prop"),
  capsule("footA0", "footA1", 1.2, 1.2, "prop"),
  capsule("footB0", "footB1", 1.2, 1.2, "prop"),
  capsule("benchHead", "benchTail", 2.8, 2.8, "prop"),
];

export function benchRig(p: number, shake = 0): Rig {
  const pelvis = vec(0, -26);
  const torso = 185; // lying on the back, chest slightly raised
  const neck = add(pelvis, scale(dir(torso), BONES.torso));
  const shoulder = add(neck, scale(dir(torso), -BONES.shoulderDrop));
  // Lockout straight above the shoulders, bottom touching the chest
  const bar = mix(vec(shoulder.x + 1.5, -57), vec(shoulder.x + 6.5, -41), p);
  bar.y += shake;
  const joints = body({
    pelvis,
    torso,
    head: 160,
    armN: { to: bar, bend: 1 },
    armF: { to: add(bar, vec(-0.8, -0.6)), bend: 1 },
    legN: { to: vec(25, ANKLE), bend: -1 },
    legF: { to: vec(22.5, ANKLE - 0.2), bend: -1 },
  });
  Object.assign(joints, BENCH_JOINTS, { bar });
  return { joints, side: 1 };
}

export function benchPressMotion(): Motion {
  const reps = new RepDriver(3.6, { effort: 0, fail: 0.97, hold: 0 });
  return {
    parts: [...BENCH_PARTS, plate("bar", 10, "prop"), ...BODY_PARTS],
    bounds: measure([0, 0.5, 1].map((p) => benchRig(p)), 12),
    reference: benchRig(0.4),
    stillTime: 0.2,
    pose: (t, dt, control) => {
      const { p, shake } = reps.next(t, dt, control);
      return benchRig(p, shake);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Dumbbell lateral raise (front view)
// ---------------------------------------------------------------------------------------------

/** Dumbbell held across the forearm: handle plus a disc at each end. */
function addDumbbell(joints: Joints, name: string, hand: Vec, forearmAngle: number) {
  const across = dir(forearmAngle + 90);
  joints[`${name}1`] = add(hand, scale(across, 5.5));
  joints[`${name}2`] = add(hand, scale(across, -5.5));
}

const raiseDumbbells = (group?: string): Part[] => [
  capsule("dbN1", "dbN2", 1.2, 1.2, "prop", group),
  disk("dbN1", 3.4, "prop", group),
  disk("dbN2", 3.4, "prop", group),
  capsule("dbF1", "dbF2", 1.2, 1.2, "prop", group),
  disk("dbF1", 3.4, "prop", group),
  disk("dbF2", 3.4, "prop", group),
];

export function raiseRig(p: number, shake = 0): Rig {
  const upperN = lerp(101, 181, p) + shake;
  const foreN = upperN - lerp(4, 10, p);
  const joints = body({
    pelvis: vec(0, -45.2),
    torso: -90,
    head: -90,
    side: 0,
    armN: { angles: [upperN, foreN] },
    armF: { angles: [180 - upperN, 180 - foreN] },
    legN: { to: vec(-7.5, ANKLE), bend: 1 },
    legF: { to: vec(7.5, ANKLE), bend: -1 },
  });
  addDumbbell(joints, "dbN", joints.handN, foreN);
  addDumbbell(joints, "dbF", joints.handF, 180 - foreN);
  return { joints, side: 0 };
}

export function lateralRaiseMotion(): Motion {
  const reps = new RepDriver(3.4, { effort: 1, fail: 0, hold: 1 });
  return {
    parts: [...BODY_PARTS, ...raiseDumbbells()],
    bounds: measure([0, 0.5, 1].map((p) => raiseRig(p)), 12),
    reference: raiseRig(0),
    stillTime: 1.4,
    pose: (t, dt, control) => {
      const { p, shake } = reps.next(t, dt, control);
      return raiseRig(p, shake * 3);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Moves used by the athlete who runs along the bottom of the landing page
// ---------------------------------------------------------------------------------------------

/** Running cycle; `phase` 0–1 is one full stride with both legs. */
export function runRig(phase: number): Rig {
  const theta = phase * Math.PI * 2;
  const leg = (a: number) => {
    const thigh = 90 - 40 * Math.sin(a);
    const shin = thigh + 16 + 88 * Math.max(0, Math.cos(a)) ** 1.3; // knee folds while the leg swings through
    return { angles: [thigh, shin] as [number, number], foot: shin - 92 };
  };
  const arm = (a: number): [number, number] => {
    const upper = 90 - 48 * Math.sin(a);
    return [upper, upper - 88];
  };
  const near = leg(theta);
  const far = leg(theta + Math.PI);
  const joints = body({
    pelvis: vec(0, -43.2 + 1.4 * Math.cos(2 * theta)),
    torso: -79,
    head: -84,
    armN: { angles: arm(theta + Math.PI) },
    armF: { angles: arm(theta) },
    legN: { angles: near.angles },
    legF: { angles: far.angles },
    footN: near.foot,
    footF: far.foot,
  });
  return { joints, side: 1 };
}

const BODY_LINE = BONES.shin + BONES.thigh + BONES.torso - BONES.shoulderDrop; // ankle → shoulder, body straight

export function pushupRig(p: number): Rig {
  const ankle = vec(-36, -6.6);
  const lineAngle = (shoulderY: number) => Math.asin(clamp((ankle.y - shoulderY) / BODY_LINE, -1, 1)) / RAD;
  const topAngle = lineAngle(-31.5);
  const beta = lineAngle(lerp(-31.5, -13.5, p));
  const line = dir(-beta);
  const pelvis = add(ankle, scale(line, BONES.shin + BONES.thigh));
  // Hands stay planted under where the shoulders are at the top
  const hand = vec(ankle.x + BODY_LINE * Math.cos(topAngle * RAD) + 1, -2.6);
  const joints = body({
    pelvis,
    torso: -beta,
    head: -beta + 6,
    armN: { to: hand, bend: 1 },
    armF: { to: add(hand, vec(-1, -0.4)), bend: 1 },
    legN: { angles: [180 - beta, 180 - beta] },
    legF: { angles: [180 - beta, 180 - beta] },
    footN: 62,
    footF: 64,
  });
  return { joints, side: 1 };
}

export function plankRig(t: number): Rig {
  const breathe = Math.sin(t * 1.8);
  const ankle = vec(-38, -6.6);
  const beta = Math.asin(clamp((ankle.y - (-18.2 + breathe * 0.35)) / BODY_LINE, -1, 1)) / RAD;
  const line = dir(-beta);
  const pelvis = add(add(ankle, scale(line, BONES.shin + BONES.thigh)), scale(dir(-beta - 90), 0.8 * breathe - 0.3));
  const neck = add(ankle, scale(line, BODY_LINE + BONES.shoulderDrop));
  const torso = angleOf(sub(neck, pelvis));
  const joints = body({
    pelvis,
    torso,
    head: torso + 8,
    armN: { angles: [90, -3] },
    armF: { angles: [92, -2] },
    legN: { to: ankle, bend: 1 },
    legF: { to: add(ankle, vec(-0.8, 0.2)), bend: 1 },
    footN: 62,
    footF: 64,
  });
  return { joints, side: 1 };
}

const MACHINE_JOINTS: Joints = {
  postL0: vec(-44, 0),
  postL1: vec(-44, -118),
  postR0: vec(44, 0),
  postR1: vec(44, -118),
  pulley: vec(0, -113),
  seatL: vec(-15, -20.5),
  seatR: vec(15, -20.5),
  seatPost0: vec(0, -20),
  seatPost1: vec(0, 0),
  baseL: vec(-18, 0),
  baseR: vec(18, 0),
};

const machineBehind = (group?: string): Part[] => [
  capsule("postL0", "postL1", 1.5, 1.5, "prop", group),
  capsule("postR0", "postR1", 1.5, 1.5, "prop", group),
  capsule("postL1", "postR1", 1.5, 1.5, "prop", group),
  capsule("seatPost0", "seatPost1", 1.4, 1.4, "prop", group),
  capsule("baseL", "baseR", 1.2, 1.2, "prop", group),
  capsule("seatL", "seatR", 2.4, 2.4, "prop", group),
];

const machineFront = (group?: string): Part[] => [
  capsule("pulley", "barC", 0.5, 0.5, "prop", group),
  disk("pulley", 3.2, "prop", group),
  capsule("barL", "barR", 1.3, 1.3, "prop", group),
];

export function pulldownRig(p: number): Rig {
  const hand = vec(lerp(24, 23, p), lerp(-84, -61, p));
  const joints = body({
    pelvis: vec(0, -30),
    torso: -90,
    head: -90,
    side: 0,
    armN: { to: vec(-hand.x, hand.y), bend: -1 },
    armF: { to: hand, bend: 1 },
    // Seated and seen from the front: the thighs point at the viewer, so they look short
    legN: { angles: [100, 92] },
    legF: { angles: [80, 88] },
    thigh: 6,
    shin: 21.8,
  });
  Object.assign(joints, MACHINE_JOINTS, { barL: vec(-hand.x - 7, hand.y), barR: vec(hand.x + 7, hand.y), barC: vec(0, hand.y) });
  return { joints, side: 0 };
}

export function curlRig(t: number): Rig {
  // Alternating arms
  const pN = repDepth(t / 2.6);
  const pF = repDepth(t / 2.6 + 0.5);
  const joints = body({
    pelvis: vec(0, -44.2),
    torso: -88,
    head: -88,
    armN: { angles: [88, lerp(86, -50, pN)] },
    armF: { angles: [91, lerp(86, -50, pF)] },
    legN: { to: vec(1.5, ANKLE), bend: -1 },
    legF: { to: vec(-1.5, ANKLE - 0.2), bend: -1 },
  });
  joints.weightN = joints.handN;
  joints.weightF = joints.handF;
  return { joints, side: 1 };
}

export function jacksRig(t: number): Rig {
  const cycle = t / 1.15;
  const open = 0.5 - 0.5 * Math.cos(2 * Math.PI * cycle);
  const lift = 3.2 * Math.abs(Math.sin(2 * Math.PI * cycle));
  const feet = 6 + 10 * open;
  const upperN = lerp(100, 238, open);
  const foreN = upperN + lerp(-3, 8, open);
  const joints = body({
    pelvis: vec(0, -45 - lift),
    torso: -90,
    head: -90,
    side: 0,
    armN: { angles: [upperN, foreN] },
    armF: { angles: [180 - upperN, 180 - foreN] },
    legN: { to: vec(-feet, ANKLE - lift), bend: 1 },
    legF: { to: vec(feet, ANKLE - lift), bend: -1 },
  });
  return { joints, side: 0 };
}

export function celebrateRig(t: number): Rig {
  const beat = Math.sin(t * 5.2);
  const hop = Math.max(0, beat) * 2.4;
  const upperN = 228 + beat * 4;
  const joints = body({
    pelvis: vec(0, -45 - hop),
    torso: -90,
    head: -94,
    side: 0,
    armN: { angles: [upperN, upperN + 28] },
    armF: { angles: [180 - upperN, 152 - upperN] },
    legN: { to: vec(-7, ANKLE - hop), bend: 1 },
    legF: { to: vec(7, ANKLE - hop), bend: -1 },
  });
  return { joints, side: 0 };
}

export type Exercise = "pushup" | "plank" | "pulldown" | "curl" | "jacks" | "squat" | "raise" | "celebrate";

/** What the landing page tells the running athlete. */
export interface TrackState {
  exercise: Exercise;
  moving: boolean;
  facing: 1 | -1;
  /** Advances with the distance run, so the feet keep pace with the scroll. */
  runPhase: number;
}

const EQUIPMENT: Partial<Record<Exercise, string>> = {
  pulldown: "machine",
  squat: "barbell",
  raise: "dumbbells",
  curl: "handWeights",
};
const GROUPS = ["machine", "barbell", "dumbbells", "handWeights"];

function exerciseRig(exercise: Exercise, t: number): Rig {
  switch (exercise) {
    case "pushup":
      return pushupRig(repDepth(t / 2.3));
    case "plank":
      return plankRig(t);
    case "pulldown":
      return pulldownRig(repDepth(t / 3.2));
    case "curl":
      return curlRig(t);
    case "jacks":
      return jacksRig(t);
    case "squat":
      return squatRig(repDepth(t / 3.4));
    case "raise":
      return raiseRig(repDepth(t / 3.2));
    case "celebrate":
      return celebrateRig(t);
  }
}

/** Only the equipment of the current exercise is shown; the rest folds away into the athlete. */
function withEquipment(rig: Rig, active?: string): Rig {
  const show: Record<string, number> = {};
  for (const group of GROUPS) show[group] = group === active ? 1 : 0;
  return { ...rig, show };
}

export function workoutTrackMotion(state: TrackState): Motion {
  let key = "";
  let from: Rig | null = null;
  let last: Rig | null = null;
  let blend = 1;

  // Sampling needs every piece of equipment laid out once; the body comes from a standing pose
  const reference: Rig = {
    side: 1,
    joints: { ...pulldownRig(0).joints, ...raiseRig(0).joints, ...squatRig(0).joints, ...curlRig(0).joints },
  };

  return {
    parts: [
      ...machineBehind("machine"),
      ...squatBar("barbell"),
      plate("weightF", 3.8, "prop", "handWeights"),
      ...BODY_PARTS,
      plate("weightN", 3.8, "prop", "handWeights"),
      ...raiseDumbbells("dumbbells"),
      ...machineFront("machine"),
    ],
    bounds: { x0: -60, y0: -124, x1: 60, y1: 2 },
    reference,
    stillTime: 0.5,
    pose(t, dt) {
      const nextKey = state.moving ? `run${state.facing}` : state.exercise;
      let rig: Rig;
      if (state.moving) {
        const run = runRig(state.runPhase);
        rig = withEquipment(state.facing < 0 ? mirrorRig(run) : run);
      } else {
        rig = withEquipment(exerciseRig(state.exercise, t), EQUIPMENT[state.exercise]);
      }
      if (nextKey !== key) {
        from = last ?? rig;
        key = nextKey;
        blend = dt === 0 ? 1 : 0;
      }
      blend = Math.min(1, blend + dt / 0.5);
      const out = from && blend < 1 ? mixRig(from, rig, easeInOut(blend)) : rig;
      last = out;
      return out;
    },
  };
}

export type AthleteKind = "squat" | "bench" | "raise";

export const MOTIONS: Record<AthleteKind, () => Motion> = {
  squat: squatMotion,
  bench: benchPressMotion,
  raise: lateralRaiseMotion,
};
