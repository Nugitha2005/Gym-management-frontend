import type { IncidentStatus } from "../../api/types";
import { cn } from "../../lib/cn";

const STEPS: Array<{ status: IncidentStatus; label: string }> = [
  { status: "REPORTED", label: "Reported" },
  { status: "IN_REVIEW", label: "In review" },
  { status: "RESOLVED", label: "Resolved" },
  { status: "CLOSED", label: "Closed" },
];

/** REPORTED → IN_REVIEW → RESOLVED → CLOSED, as a four-step bar. */
export function IncidentProgress({ status }: { status: IncidentStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol aria-label={`Status: ${STEPS[current]?.label}`} className="m-0 grid list-none grid-cols-4 gap-1.5 p-0">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.status} aria-current={i === current ? "step" : undefined} className="flex min-w-0 flex-col gap-1.5">
            <span className={cn("h-1.5 rounded-full", done ? (i === current ? "bg-ocean" : "bg-ocean/45") : "bg-track")} />
            <span className={cn("truncate text-[12px]", i === current ? "font-bold text-ink" : done ? "font-semibold text-muted" : "font-medium text-placeholder")}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The one step forward the backend allows from each status. */
export function nextIncidentStatus(status: IncidentStatus): { status: IncidentStatus; label: string } | null {
  switch (status) {
    case "REPORTED":
      return { status: "IN_REVIEW", label: "Start review" };
    case "IN_REVIEW":
      return { status: "RESOLVED", label: "Mark resolved" };
    case "RESOLVED":
      return { status: "CLOSED", label: "Close incident" };
    default:
      return null;
  }
}
