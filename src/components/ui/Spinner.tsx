import { cn } from "../../lib/cn";

export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Shown while the app asks the backend who is logged in. */
export function FullPageLoader({ tone = "light" }: { tone?: "light" | "navy" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-dvh items-center justify-center",
        tone === "navy" ? "bg-navy text-on-navy" : "bg-off-white text-muted",
      )}
    >
      <Spinner size={28} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Grey placeholder block while a card loads. */
export function Skeleton({ className }: { className?: string }) {
  // A block <span> so it is valid inside <p> and headings as well as <div>
  return <span aria-hidden="true" className={cn("block rounded-control bg-track", "animate-pulse", className)} />;
}
