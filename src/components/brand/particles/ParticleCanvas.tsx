import { useEffect, useRef } from "react";
import { cn } from "../../../lib/cn";
import { startParticleCanvas, type ParticleScene } from "./engine";

interface ParticleCanvasProps {
  /** Creates the scene. Called again only when `sceneKey` changes. */
  createScene: () => ParticleScene;
  sceneKey: string;
  /** Ambient triangles per 10,000 px². */
  ambient?: number;
  /** Push particles away from the mouse. */
  interactive?: boolean;
  /** The scene fits its shape into this element's box. */
  anchorRef?: React.RefObject<HTMLElement | null>;
  lineWidth?: number;
  /** Dark outline under each triangle (see EngineOptions.halo). */
  halo?: { color: string; width: number };
  className?: string;
}

/** A decorative canvas that fills its (positioned) parent and runs a particle scene. */
export function ParticleCanvas({
  createScene,
  sceneKey,
  ambient = 1,
  interactive = true,
  anchorRef,
  lineWidth,
  halo,
  className,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Always use the latest factory without restarting the animation on every render
  const factory = useRef(createScene);
  factory.current = createScene;
  const haloColor = halo?.color;
  const haloWidth = halo?.width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return startParticleCanvas(canvas, factory.current(), {
      ambient,
      interactive,
      lineWidth,
      halo: haloColor ? { color: haloColor, width: haloWidth ?? 2.5 } : undefined,
      anchor: () => anchorRef?.current ?? null,
    });
  }, [sceneKey, ambient, interactive, lineWidth, haloColor, haloWidth, anchorRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)} />;
}
