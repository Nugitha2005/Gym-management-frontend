// Shared Framer Motion settings from the app's design system:
//   card entrance: fade + slide up 14px, 350ms cubic-bezier(.2,.8,.2,1), 60ms stagger
//   numbers: count up from 0, ease-out 900ms
// Everything renders in its final state when the device asks for reduced motion.
import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const EASE_SOFT = [0.2, 0.8, 0.2, 1] as const;

export const riseVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_SOFT } },
};

const staggerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

type Tag = "div" | "section" | "ul" | "ol" | "li" | "article" | "header" | "footer" | "span" | "p" | "h1" | "h2" | "h3";

interface StaggerProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
  /** Animate when scrolled into view (landing) instead of on mount (app screens). */
  inView?: boolean;
  stagger?: number;
  delay?: number;
  children: React.ReactNode;
}

/** Container whose <Rise> children fade up one after another. */
export function Stagger({ as = "div", inView = false, stagger = 0.06, delay = 0, children, ...rest }: StaggerProps) {
  const reduce = useReducedMotion();
  const Component = motion[as] as React.ElementType;
  const trigger = inView
    ? { whileInView: "show", viewport: { once: true, amount: 0.2 } }
    : { animate: "show" };
  return (
    <Component
      {...rest}
      variants={staggerVariants(stagger, delay)}
      initial={reduce ? false : "hidden"}
      {...(reduce ? { animate: "show" } : trigger)}
    >
      {children}
    </Component>
  );
}

interface RiseProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
  children?: React.ReactNode;
}

/** One card/section that fades up. Use inside <Stagger>, or on its own with `standalone`. */
export function Rise({ as = "div", standalone = false, children, ...rest }: RiseProps & { standalone?: boolean }) {
  const reduce = useReducedMotion();
  const Component = motion[as] as React.ElementType;
  const own = standalone
    ? { initial: reduce ? false : "hidden", whileInView: "show", viewport: { once: true, amount: 0.2 } }
    : {};
  return (
    <Component {...rest} variants={riseVariants} {...own}>
      {children}
    </Component>
  );
}

interface CountUpProps {
  value: number;
  /** Seconds */
  duration?: number;
  decimals?: number;
  className?: string;
  /** Wait until the number is on screen (landing stats). */
  startInView?: boolean;
}

/** Number that counts up from 0 (or from its previous value) with an ease-out. */
export function CountUp({ value, duration = 0.9, decimals = 0, className, startInView = false }: CountUpProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const visible = useInView(ref, { once: true, amount: 0.6 });
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    if (startInView && !visible) return;
    const controls = animate(from.current, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, duration, reduce, startInView, visible]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {shown.toFixed(decimals)}
    </span>
  );
}
