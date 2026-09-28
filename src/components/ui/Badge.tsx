import { cn } from "../../lib/cn";
import type {
  BookingStatus,
  ClearanceStatus,
  IncidentSeverity,
  IncidentStatus,
  LoanStatus,
  WaitlistStatus,
} from "../../api/types";

// Badge: full round pill, tinted fill, dark ink, dot.
export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info" | "orange" | "navy";

const toneClass: Record<BadgeTone, { pill: string; dot: string }> = {
  success: { pill: "bg-success-bg text-success-ink", dot: "bg-success" },
  warning: { pill: "bg-warning-bg text-warning-ink", dot: "bg-warning" },
  danger: { pill: "bg-danger-bg text-danger-ink", dot: "bg-danger" },
  neutral: { pill: "bg-neutral-bg text-neutral-ink", dot: "bg-neutral" },
  info: { pill: "bg-tile text-ocean", dot: "bg-ocean" },
  orange: { pill: "bg-orange-wash text-orange-ink", dot: "bg-orange" },
  navy: { pill: "bg-navy text-white", dot: "bg-orange" },
};

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  /** Pulsing green dot for live data. */
  live?: boolean;
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = "neutral", dot = true, live, size = "md", className, children }: BadgeProps) {
  const t = toneClass[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full font-bold whitespace-nowrap",
        size === "md" ? "h-7 px-2.5 text-[13px]" : "h-6 px-2 text-[12px]",
        t.pill,
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", t.dot, live && "animate-live-dot")} />}
      {children}
    </span>
  );
}

/** Small green "Live" marker with a pulsing dot. */
export function LiveDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-success animate-live-dot", className)} />;
}

// ---- Status -> badge mappings shared by every screen ----

export function ClearanceBadge({ status, children, className }: { status: ClearanceStatus | "NONE"; children?: React.ReactNode; className?: string }) {
  const map: Record<ClearanceStatus | "NONE", [BadgeTone, string]> = {
    APPROVED: ["success", "Approved"],
    PENDING: ["warning", "Pending"],
    REJECTED: ["danger", "Rejected"],
    REVOKED: ["danger", "Revoked"],
    NONE: ["neutral", "None"],
  };
  const [tone, label] = map[status];
  return (
    <Badge tone={tone} className={className}>
      {children ?? label}
    </Badge>
  );
}

export function BookingBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, [BadgeTone, string]> = {
    CONFIRMED: ["success", "Confirmed"],
    ATTENDED: ["info", "Attended"],
    CANCELLED: ["neutral", "Cancelled"],
    NO_SHOW: ["danger", "No-show"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function WaitlistBadge({ status }: { status: WaitlistStatus }) {
  const map: Record<WaitlistStatus, [BadgeTone, string]> = {
    OFFERED: ["orange", "Offered"],
    WAITING: ["warning", "Waiting"],
    CONVERTED: ["success", "Accepted"],
    EXPIRED: ["neutral", "Expired"],
    CANCELLED: ["neutral", "Cancelled"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function LoanBadge({ status, overdue }: { status: LoanStatus; overdue?: boolean }) {
  if (status === "LATE" || (status === "BORROWED" && overdue)) {
    return (
      <Badge tone="danger" size="sm" className="font-extrabold tracking-wide">
        LATE
      </Badge>
    );
  }
  if (status === "RETURNED") return <Badge tone="success" size="sm">Returned</Badge>;
  return <Badge tone="info" size="sm">Borrowed</Badge>;
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const map: Record<IncidentSeverity, [BadgeTone, string]> = {
    HIGH: ["danger", "High"],
    MEDIUM: ["warning", "Medium"],
    LOW: ["neutral", "Low"],
  };
  const [tone, label] = map[severity];
  return <Badge tone={tone} size="sm">{label}</Badge>;
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const map: Record<IncidentStatus, [BadgeTone, string]> = {
    REPORTED: ["warning", "Reported"],
    IN_REVIEW: ["info", "In review"],
    RESOLVED: ["success", "Resolved"],
    CLOSED: ["neutral", "Closed"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone} size="sm">{label}</Badge>;
}
