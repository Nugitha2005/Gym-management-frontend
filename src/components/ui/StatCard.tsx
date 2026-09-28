import { CountUp } from "../../lib/motion";
import { cn } from "../../lib/cn";
import { LiveDot } from "./Badge";
import { TileLink } from "./Card";
import { Skeleton } from "./Spinner";

interface StatCardProps {
  to: string;
  label: string;
  value: number | undefined;
  /** e.g. "/ 20" */
  suffix?: string;
  sub?: React.ReactNode;
  live?: boolean;
  /** Marks the number red/orange when it needs attention. */
  tone?: "default" | "danger" | "warning";
  extra?: React.ReactNode;
}

/** Dashboard number tile with count-up (design system: numbers count up from 0, 900ms ease-out). */
export function StatCard({ to, label, value, suffix, sub, live, tone = "default", extra }: StatCardProps) {
  return (
    <TileLink to={to} label={`${label}: ${value ?? "loading"}${suffix ? ` ${suffix}` : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-muted">{label}</span>
        {live && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-label text-success-ink uppercase">
            <LiveDot className="h-2 w-2" />
            Live
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        {value === undefined ? (
          <Skeleton className="h-10 w-16" />
        ) : (
          <CountUp
            value={value}
            className={cn(
              "text-[40px] leading-none font-extrabold tracking-[-0.02em]",
              tone === "danger" && value > 0 && "text-danger-ink",
              tone === "warning" && value > 0 && "text-warning-ink",
            )}
          />
        )}
        {suffix && <span className="text-[18px] font-bold text-muted">{suffix}</span>}
      </div>
      {sub && <div className="text-[14px] text-muted">{sub}</div>}
      {extra}
    </TileLink>
  );
}
