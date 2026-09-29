import { AnimatePresence, motion, useAnimate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/cn";

/*
 * "Load the bar" — a playful progress bar for the register form. Every required field filled in
 * correctly slides a plate onto the barbell; the optional field adds a small change plate on each side.
 * When the bar is fully loaded it turns orange. Purely decorative (the form fields carry their own
 * validation messages), so it is hidden from screen readers.
 */

interface LoadBarProps {
  /** One entry per required field: true once it is filled in correctly. */
  loaded: boolean[];
  /** The optional field is filled in: add the small plates. */
  bonus?: boolean;
  /** Change this number to shake the bar (e.g. after a submit with mistakes). */
  shake?: number;
  className?: string;
}

// Plate slots, loaded in this order: inner pair first, then the outer pair (viewBox 320 × 64)
const SLOTS = [
  { side: -1, x: 89, y: 6, w: 13, h: 52, fill: "var(--color-orange)" },
  { side: 1, x: 218, y: 6, w: 13, h: 52, fill: "var(--color-orange)" },
  { side: -1, x: 74, y: 12, w: 12, h: 40, fill: "var(--color-ocean)" },
  { side: 1, x: 234, y: 12, w: 12, h: 40, fill: "var(--color-ocean)" },
];
const BONUS = [
  { side: -1, x: 64, y: 20, w: 7, h: 24 },
  { side: 1, x: 249, y: 20, w: 7, h: 24 },
];

export function LoadBar({ loaded, bonus = false, shake = 0, className }: LoadBarProps) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<SVGGElement>();
  const count = loaded.filter(Boolean).length;
  const done = count === loaded.length;
  const lastCount = useRef(count);
  const lastShake = useRef(shake);

  // A small "clink" bounce whenever a plate goes on
  useEffect(() => {
    if (!reduce && count > lastCount.current && scope.current) {
      void animate(scope.current, { y: [0, 3, -1.5, 0] }, { duration: 0.42, ease: "easeOut" });
    }
    lastCount.current = count;
  }, [count, reduce, animate, scope]);

  // Shake when the form was sent with mistakes
  useEffect(() => {
    if (!reduce && shake !== lastShake.current && scope.current) {
      void animate(scope.current, { x: [0, -7, 7, -5, 5, -2, 0] }, { duration: 0.45 });
    }
    lastShake.current = shake;
  }, [shake, reduce, animate, scope]);

  const slide = (side: number) =>
    reduce
      ? { initial: false as const, animate: { x: 0, opacity: 1 }, exit: { opacity: 0 } }
      : {
          initial: { x: side * 34, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: side * 34, opacity: 0 },
          transition: { type: "spring" as const, stiffness: 520, damping: 26 },
        };

  return (
    <div aria-hidden="true" className={cn("flex flex-col items-center gap-1.5 select-none", className)}>
      <svg
        viewBox="0 0 320 64"
        className="h-12 w-full max-w-[300px] overflow-visible"
        style={{
          filter: done ? "drop-shadow(0 0 8px rgba(255, 107, 53, 0.45))" : "none",
          transition: "filter 300ms ease",
        }}
      >
        <g ref={scope}>
          {/* Empty slots */}
          {SLOTS.map((s, i) => (
            <rect
              key={`slot-${i}`}
              x={s.x}
              y={s.y}
              width={s.w}
              height={s.h}
              rx={3}
              fill="none"
              stroke="var(--color-line-strong)"
              strokeDasharray="3 3"
            />
          ))}
          {/* Bar, sleeves and collars */}
          <rect
            x={18}
            y={29}
            width={284}
            height={6}
            rx={3}
            style={{ fill: done ? "var(--color-orange)" : "var(--color-navy)", transition: "fill 300ms ease" }}
          />
          <rect x={18} y={27} width={12} height={10} rx={2} fill="var(--color-navy)" />
          <rect x={290} y={27} width={12} height={10} rx={2} fill="var(--color-navy)" />
          <rect x={104} y={23} width={6} height={18} rx={2} fill="var(--color-navy)" />
          <rect x={210} y={23} width={6} height={18} rx={2} fill="var(--color-navy)" />
          {/* Loaded plates */}
          <AnimatePresence initial={false}>
            {SLOTS.map((s, i) =>
              i < count ? <motion.rect key={`plate-${i}`} x={s.x} y={s.y} width={s.w} height={s.h} rx={3} fill={s.fill} {...slide(s.side)} /> : null,
            )}
            {bonus &&
              BONUS.map((s, i) => (
                <motion.rect key={`bonus-${i}`} x={s.x} y={s.y} width={s.w} height={s.h} rx={2} fill="var(--color-warning)" {...slide(s.side)} />
              ))}
          </AnimatePresence>
        </g>
      </svg>
      <p className={cn("m-0 text-[12px] font-semibold tracking-[0.02em]", done ? "text-orange-ink" : "text-muted")}>
        {done ? "Bar loaded — ready to lift" : `Load the bar: ${count} of ${loaded.length} fields done`}
      </p>
    </div>
  );
}
