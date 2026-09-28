import { dateTile } from "../../lib/format";
import { cn } from "../../lib/cn";

/** "SUN / 27" tile used for bookings and sessions. */
export function DateTile({ value, tone = "light", className }: { value: string | Date; tone?: "light" | "orange"; className?: string }) {
  const { dow, day } = dateTile(value);
  return (
    <div
      className={cn(
        "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[14px]",
        tone === "orange" ? "bg-orange text-navy" : "bg-ghost-hover text-ink",
        className,
      )}
    >
      <span className={cn("text-label font-bold tracking-label", tone === "orange" ? "text-navy" : "text-muted")}>{dow}</span>
      <span className="text-[26px] leading-none font-extrabold tabular-nums">{day}</span>
    </div>
  );
}
