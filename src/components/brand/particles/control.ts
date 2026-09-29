import { repDepth, STANDARD_REP, type RepShape } from "./geometry";

/*
 * Lets the page talk to an animation. The login and register forms use it:
 *   bump()        — typing gives the lifter energy, so the reps speed up for a moment
 *   set("effort") — the form is being sent: the lifter drives the weight up and holds it
 *   set("fail")   — something was wrong: the weight sinks and shakes, then normal reps resume
 *   set("hold")   — a small win (e.g. every field filled in): hold the top position briefly
 */

export type ControlMode = "normal" | "effort" | "fail" | "hold";

export class MotionControl {
  energy = 0;
  mode: ControlMode = "normal";
  /** Seconds spent in the current mode. */
  modeTime = 0;

  bump(amount = 0.25): void {
    this.energy = Math.min(1, this.energy + amount);
  }

  set(mode: ControlMode): void {
    this.mode = mode;
    this.modeTime = 0;
  }

  /** Called once per frame by the scene: energy fades and short modes end by themselves. */
  tick(dt: number): void {
    this.energy *= Math.exp(-dt / 1.1);
    this.modeTime += dt;
    if ((this.mode === "fail" && this.modeTime > 1.8) || (this.mode === "hold" && this.modeTime > 1.6)) {
      this.set("normal");
    }
  }

  /** How fast the reps run: 1 = resting pace, up to 2.5 when the user is typing. */
  get tempo(): number {
    return 1 + 1.5 * this.energy;
  }
}

/**
 * Turns the running clock into the depth of the current rep (0 = top, 1 = bottom).
 * Outside the normal mode the depth glides to a fixed target instead, so every change is smooth.
 */
export class RepDriver {
  private depth = 0;

  constructor(
    private readonly period: number,
    private readonly targets: Partial<Record<ControlMode, number>> = {},
    private readonly shape: RepShape = STANDARD_REP,
  ) {}

  next(t: number, dt: number, control?: MotionControl): { p: number; shake: number } {
    const mode = control?.mode ?? "normal";
    const fixed = mode === "normal" ? undefined : this.targets[mode];
    const target = fixed ?? repDepth(t / this.period, this.shape);
    if (dt === 0) {
      this.depth = target;
    } else {
      const rate = fixed === undefined ? 14 : 5;
      this.depth += (target - this.depth) * (1 - Math.exp(-rate * dt));
    }

    let shake = 0;
    if (control && mode === "fail") shake = Math.sin(control.modeTime * 38) * 1.6 * Math.exp(-control.modeTime * 1.5);
    if (control && mode === "effort") shake = Math.sin(control.modeTime * 44) * 0.4;
    return { p: this.depth, shake };
  }
}
