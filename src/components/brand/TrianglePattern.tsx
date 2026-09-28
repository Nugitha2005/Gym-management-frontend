import { useMemo } from "react";
import { cn } from "../../lib/cn";

/** Small deterministic random generator so the pattern is identical on every render. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Static, very faint field of outlined triangles — the Dala "ambient particle" hint for the
 * navy top bar and sidebar. Never animated, kept at ≤ 8% opacity so the app stays formal.
 */
export function TrianglePattern({
  width = 248,
  height = 900,
  count = 26,
  seed = 7,
  opacity = 0.07,
  className,
}: {
  width?: number;
  height?: number;
  count?: number;
  seed?: number;
  opacity?: number;
  className?: string;
}) {
  const triangles = useMemo(() => {
    const rand = seeded(seed);
    return Array.from({ length: count }, () => {
      const x = rand() * width;
      const y = rand() * height;
      const r = 3 + rand() * 5;
      const a = rand() * Math.PI * 2;
      const points = [0, 1, 2]
        .map((i) => {
          const angle = a + (i * 2 * Math.PI) / 3;
          return `${(x + Math.cos(angle) * r).toFixed(1)},${(y + Math.sin(angle) * r).toFixed(1)}`;
        })
        .join(" ");
      return { points, accent: rand() < 0.22 };
    });
  }, [width, height, count, seed]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMin slice"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity: Math.min(opacity, 0.08) }}
      fill="none"
      strokeWidth={1.2}
      strokeLinejoin="round"
    >
      {triangles.map((t, i) => (
        <polygon key={i} points={t.points} className={t.accent ? "stroke-orange" : "stroke-white"} />
      ))}
    </svg>
  );
}
