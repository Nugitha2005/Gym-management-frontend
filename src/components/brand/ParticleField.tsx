import { ParticleCanvas } from "./particles/ParticleCanvas";
import { DumbbellScene, EmptyScene } from "./particles/scenes";

/*
 * Our take on Dala's signature visual: small outlined triangles that fly in and assemble into
 * a dumbbell, drift gently and shy away from the mouse, over a sparse field of ambient triangles.
 * With shape="none" only the ambient field is drawn. For the animated athletes see ParticleAthlete.
 * The engine itself lives in ./particles (pauses off-screen, still frame under prefers-reduced-motion).
 */

interface ParticleFieldProps {
  /** "dumbbell" assembles the gym shape; "none" leaves only the ambient field. */
  shape?: "dumbbell" | "none";
  /** Multiplies how many triangles make up the shape. */
  density?: number;
  /** Ambient triangles per 10,000 px² of canvas. */
  ambient?: number;
  /** Opacity of the assembled shape. */
  shapeOpacity?: number;
  interactive?: boolean;
  /** The shape is fitted inside this element's box. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /** Fallback placement when there is no anchor: centre (0–1) and size (fraction of the shorter side). */
  placement?: { x: number; y: number; size: number };
  /** Tilt of the dumbbell in degrees. */
  tilt?: number;
  className?: string;
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
  return (
    <ParticleCanvas
      sceneKey={`${shape}|${density}|${shapeOpacity}|${tilt}|${placement.x}|${placement.y}|${placement.size}`}
      createScene={() =>
        shape === "dumbbell" ? new DumbbellScene({ density, opacity: shapeOpacity, tilt, placement }) : new EmptyScene()
      }
      ambient={ambient}
      interactive={interactive}
      anchorRef={anchorRef}
      className={className}
    />
  );
}
