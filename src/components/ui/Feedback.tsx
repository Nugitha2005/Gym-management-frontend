import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { errorMessage } from "../../api/client";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

// ---------- Inline alert ----------

type AlertTone = "danger" | "success" | "warning" | "info";
const alertTone: Record<AlertTone, { box: string; icon: IconName }> = {
  danger: { box: "border-danger-edge bg-danger-hover text-danger-ink", icon: "alert" },
  success: { box: "border-success-edge bg-success-wash text-success-ink", icon: "checkCircle" },
  warning: { box: "border-warning/40 bg-warning-bg text-warning-ink", icon: "warning" },
  info: { box: "border-line bg-tile text-ocean", icon: "info" },
};

export function Alert({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = alertTone[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-control border px-4 py-3 text-[14px]", t.box, className)}
    >
      <Icon name={t.icon} size={20} strokeWidth={2} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="m-0 font-bold">{title}</p>}
        {children && <div className={cn("text-ink/80", !!title && "mt-0.5")}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

/** Error box for a failed load, with a retry button. */
export function LoadError({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <Alert
      tone="danger"
      title="Couldn't load this"
      className={className}
      action={
        onRetry && (
          <Button size="sm" variant="ghost" icon="refresh" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

// ---------- Empty state ----------

export function EmptyState({
  icon = "info",
  title,
  children,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-4 py-10 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-control bg-tile text-ocean">
        <Icon name={icon} size={24} />
      </div>
      <p className="m-0 text-card-title font-bold text-ink">{title}</p>
      {children && <div className="m-0 max-w-sm text-[14px] text-muted">{children}</div>}
      {action}
    </div>
  );
}

// ---------- Progress bar ----------

export function ProgressBar({
  value,
  max,
  label,
  tone = "ocean",
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: "ocean" | "orange" | "danger" | "success";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const fill = { ocean: "bg-ocean", orange: "bg-orange", danger: "bg-danger", success: "bg-success" }[tone];
  const track = tone === "orange" ? "bg-orange-track" : "bg-track";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-1.5 w-full overflow-hidden rounded-full", track, className)}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-soft", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ---------- Toasts ----------

interface Toast {
  id: number;
  tone: "success" | "danger" | "info";
  message: string;
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, message }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                "pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-control px-4 py-3 text-[14px] font-semibold shadow-hover",
                t.tone === "danger" ? "bg-danger-strong text-white" : "bg-navy text-white",
              )}
            >
              <Icon
                name={t.tone === "danger" ? "alert" : t.tone === "info" ? "info" : "checkCircle"}
                size={18}
                strokeWidth={2}
                className={t.tone === "success" ? "text-orange" : undefined}
              />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
