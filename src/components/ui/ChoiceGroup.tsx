import { useId, useRef } from "react";
import { cn } from "../../lib/cn";

export interface Choice<V extends string> {
  value: V;
  label: string;
  /** Optional coloured dot (e.g. severity). */
  dot?: string;
  hint?: string;
}

/**
 * A radiogroup of chip buttons (goal type, incident type, severity, decision).
 * Arrow keys move the selection, like native radio buttons.
 */
export function ChoiceGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  error,
  columns,
  size = "md",
}: {
  label: string;
  options: Choice<V>[];
  value: V | null;
  onChange: (value: V) => void;
  error?: string | null;
  /** Force an even grid (e.g. 3 for Low/Medium/High). */
  columns?: number;
  size?: "md" | "sm";
}) {
  const labelId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    else return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id={labelId} className="text-[14px] font-semibold text-ink">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={!!error || undefined}
        className={cn("gap-2", columns ? "grid" : "flex flex-wrap")}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option, i) => {
          const checked = option.value === value;
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (selectedIndex === -1 && i === 0) ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "press flex min-w-0 items-center justify-center gap-2 rounded-control border px-3.5 font-bold",
                size === "md" ? "h-11 text-[14px]" : "h-10 text-[13px]",
                checked
                  ? "border-ocean bg-ocean text-white"
                  : "border-line-strong bg-white text-ink hover:bg-ghost-hover",
              )}
            >
              {option.dot && <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-full", option.dot)} />}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="m-0 text-[13px] font-semibold text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
