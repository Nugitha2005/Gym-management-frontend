import { forwardRef, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "./Icon";

// Inputs: 48px high, 12px radius, line-strong border; focus = ocean border + soft ring (design system).
// On phones the font is 16px so iOS doesn't zoom into the field.
const controlBase =
  "w-full rounded-control border bg-white px-3.5 text-base text-ink transition-[border-color,box-shadow] duration-150 sm:text-[15px] " +
  "focus:outline-none focus-visible:outline-none disabled:bg-off-white disabled:text-muted";
const controlOk = "border-line-strong focus:border-ocean focus:ring-4 focus:ring-ocean/15";
const controlError = "border-danger focus:border-danger focus:ring-4 focus:ring-danger/15";

interface FieldProps {
  label: React.ReactNode;
  /** Shown under the control when there is no error. */
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  /** Right-aligned text next to the label, e.g. "120 / 500". */
  aside?: React.ReactNode;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}

/** Label + control + hint/error, wired up with ids for screen readers. */
export function Field({ label, hint, error, optional, aside, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  const hasMessage = !!error || !!hint;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] font-semibold text-ink">
          {label}
          {optional && <span className="ml-1 font-medium text-muted">(optional)</span>}
        </label>
        {aside && <span className="text-[13px] font-medium text-muted tabular-nums">{aside}</span>}
      </div>
      {children({ id, describedBy: hasMessage ? messageId : undefined, invalid: !!error })}
      {error ? (
        <p id={messageId} role="alert" className="m-0 flex items-start gap-1.5 text-[13px] font-semibold leading-5 text-danger-text">
          <Icon name="alert" size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <div id={messageId} className="text-[13px] leading-5 text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; inputSize?: "md" | "lg" };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, inputSize = "md", className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, inputSize === "lg" ? "h-[50px] sm:h-12" : "h-12", invalid ? controlError : controlOk, className)}
      {...rest}
    />
  );
});

/** Password input with a show/hide toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(
  { className, ...rest },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-12", className)} {...rest} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[10px] text-muted hover:bg-ghost-hover hover:text-ink"
      >
        <Icon name={visible ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, "resize-y py-3 leading-relaxed", invalid ? controlError : controlOk, className)}
      {...rest}
    />
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; selectSize?: "md" | "sm" };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, children, selectSize = "md", ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          "appearance-none pr-10",
          selectSize === "sm" ? "h-10 text-[14px] sm:text-[14px]" : "h-12",
          invalid ? controlError : controlOk,
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={18}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
);
