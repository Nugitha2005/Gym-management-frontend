import { motion, useReducedMotion } from "framer-motion";
import { useId, useRef } from "react";
import { cn } from "../../lib/cn";

export interface TabItem<K extends string> {
  key: K;
  label: string;
  count?: number;
  /** Small orange note next to the label, e.g. "1 offer". */
  note?: string;
}

/** Segmented tab control with a sliding white indicator (arrow keys move between tabs). */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  idPrefix,
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  /** Pass the same prefix to <TabPanel> so tabs and panels are linked. */
  idPrefix: string;
}) {
  const reduce = useReducedMotion();
  const indicatorId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative flex max-w-full self-start overflow-x-auto rounded-[14px] bg-track p-1"
    >
      {items.map((item, i) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${item.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${item.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "press relative flex h-10 items-center gap-2 rounded-[10px] px-4 text-[14px] whitespace-nowrap",
              selected ? "font-bold text-ink" : "font-semibold text-muted hover:text-ink",
            )}
          >
            {selected && (
              <motion.span
                layoutId={indicatorId}
                transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0 rounded-[10px] bg-white shadow-card"
              />
            )}
            <span className="relative">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  "relative inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px] font-bold tabular-nums",
                  selected ? "bg-tile text-ocean" : "bg-white/70 text-muted",
                )}
              >
                {item.count}
              </span>
            )}
            {item.note && <span className="relative text-[12px] font-bold text-orange-ink">{item.note}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Panel for one tab; cross-fades in (design system: tab change 250–300ms). */
export function TabPanel({ idPrefix, tabKey, children, className }: { idPrefix: string; tabKey: string; children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={tabKey}
      role="tabpanel"
      id={`${idPrefix}-panel-${tabKey}`}
      aria-labelledby={`${idPrefix}-tab-${tabKey}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
