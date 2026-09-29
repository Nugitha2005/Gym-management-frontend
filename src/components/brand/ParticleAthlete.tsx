import type { MotionControl } from "./particles/control";
import { ParticleCanvas } from "./particles/ParticleCanvas";
import { MOTIONS, type AthleteKind } from "./particles/poses";
import { AthleteScene } from "./particles/scenes";

/*
 * A muscular athlete made of the app's triangles, doing one exercise on a loop:
 *   squat — landing hero (starts as the dumbbell, which dissolves into the athlete)
 *   bench — login panel
 *   raise — register panel (dumbbell lateral raises)
 * Pass a MotionControl to let a form drive the animation (see layouts/authScene.ts).
 */

interface ParticleAthleteProps {
  kind: AthleteKind;
  /** Fit the athlete into this element's box… */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** …or into this box (fractions of the canvas: centre x/y, width, height). */
  box?: { x: number; y: number; w: number; h: number };
  /** Distance between outline particles in px (smaller = finer). */
  spacing?: number;
  /** Ambient triangles per 10,000 px². */
  ambient?: number;
  opacity?: number;
  intro?: "dumbbell" | "gather";
  control?: MotionControl;
  interactive?: boolean;
  className?: string;
}

export function ParticleAthlete({
  kind,
  anchorRef,
  box,
  spacing = 5,
  ambient = 1,
  opacity = 0.95,
  intro = "gather",
  control,
  interactive = true,
  className,
}: ParticleAthleteProps) {
  return (
    <ParticleCanvas
      sceneKey={`${kind}|${spacing}|${opacity}|${intro}|${box ? `${box.x},${box.y},${box.w},${box.h}` : ""}`}
      createScene={() => new AthleteScene({ motion: MOTIONS[kind](), spacing, opacity, intro, control, box })}
      ambient={ambient}
      interactive={interactive}
      anchorRef={anchorRef}
      className={className}
    />
  );
}
