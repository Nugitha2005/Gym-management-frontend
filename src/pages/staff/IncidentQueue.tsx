import { useEffect, useRef, useState } from "react";
import { errorMessage } from "../../api/client";
import { incidentApi } from "../../api/endpoints";
import type { Incident } from "../../api/types";
import { useUser } from "../../auth/AuthContext";
import { roleLabel } from "../../auth/roles";
import { IncidentProgress, nextIncidentStatus } from "../../components/domain/IncidentProgress";
import { IncidentStatusBadge, SeverityBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field, Input } from "../../components/ui/Field";
import { Alert, EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/cn";
import { incidentTypeLabel } from "../../lib/domain";
import { durationLabel, fmtDayMonth, fmtTime, minutesBetween, parseLocal } from "../../lib/format";
import { Stagger } from "../../lib/motion";

// Response deadlines set by the backend routing (DoctorIncidentHandler / TrainerIncidentHandler)
const DEADLINES = {
  DOCTOR: "Respond within 1 hour for high, 4 hours for medium and 24 hours for low.",
  TRAINER: "Respond within 4 hours for high, 24 hours for medium and 72 hours for low.",
  ADMIN: "Injuries, equipment damage and facility issues together — the doctor and trainers each see their own part.",
};

/**
 * 20_Trainer_Incident_queue / 25_Doctor_Injury_queue: the queue on the left (most serious first,
 * as the backend sorts it), details, timeline, "Add action" and the one-step status change on the right.
 */
export default function IncidentQueue() {
  const user = useUser();
  const toast = useToast();
  const now = useNow(30_000);
  const wide = useMediaQuery("(min-width: 1024px)");
  const queue = useApi(incidentApi.queue, [], { refreshMs: 60_000 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const role = user.roleName === "DOCTOR" ? "DOCTOR" : user.roleName === "ADMIN" ? "ADMIN" : "TRAINER";
  const isDoctor = role === "DOCTOR";

  const list = (queue.data ?? []).filter((i) => i.status !== "CLOSED");
  const selected = list.find((i) => i.incidentId === selectedId) ?? (wide ? list[0] : undefined);

  // Keep the selection valid when the queue refreshes
  useEffect(() => {
    if (selectedId && queue.data && !queue.data.some((i) => i.incidentId === selectedId && i.status !== "CLOSED")) setSelectedId(null);
  }, [queue.data, selectedId]);

  function select(id: number) {
    setSelectedId(id);
    if (!wide) window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function replace(updated: Incident) {
    queue.setData((items) => (items ?? []).map((i) => (i.incidentId === updated.incidentId ? updated : i)));
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow={isDoctor ? "Doctor · Injuries" : role === "ADMIN" ? "Admin · Incidents" : "Front desk · Incidents"}
        title={isDoctor ? "Injury queue" : "Incident queue"}
        description={`${isDoctor ? "Open injury reports" : role === "ADMIN" ? "Every open incident" : "Open incidents"}, most serious first. ${DEADLINES[role]}`}
      />

      {queue.loading && !queue.data ? (
        <Skeleton className="h-80 rounded-card" />
      ) : queue.error ? (
        <LoadError error={queue.error} onRetry={() => queue.reload()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="checkCircle" title={isDoctor ? "No open injuries" : "No open incidents"}>
            New reports from members will appear here.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(300px,0.85fr)_1.4fr] lg:gap-6">
          <Card padding="none" aria-label={isDoctor ? "Open injuries" : "Open incidents"} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
              <span className="text-[14px] font-bold">Open</span>
              <span className="rounded-full bg-tile px-2.5 py-0.5 text-[12px] font-bold text-ocean tabular-nums">{list.length}</span>
            </div>
            <ul className="m-0 flex list-none flex-col p-2">
              {list.map((i) => {
                const due = parseLocal(i.responseDueAt);
                const overdueFor = due && due < now ? minutesBetween(due, now) : 0;
                const active = selected?.incidentId === i.incidentId;
                return (
                  <li key={i.incidentId}>
                    <button
                      type="button"
                      onClick={() => select(i.incidentId)}
                      aria-current={active || undefined}
                      className={cn(
                        "press flex w-full flex-col gap-1.5 rounded-control border px-3.5 py-3 text-left",
                        active ? "border-ocean bg-tile" : "border-transparent hover:bg-ghost-hover",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-ink">{incidentTypeLabel[i.incidentType]}</span>
                        <SeverityBadge severity={i.severity} />
                        <span className="ml-auto">
                          <IncidentStatusBadge status={i.status} />
                        </span>
                      </span>
                      <span className="text-[13px] text-muted">
                        {i.reportedByName} · {fmtDayMonth(i.reportedAt)} {fmtTime(i.reportedAt)}
                      </span>
                      {i.status === "REPORTED" && due && (
                        <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", i.responseOverdue || overdueFor > 0 ? "text-danger-ink" : "text-muted")}>
                          <Icon name="clock" size={14} strokeWidth={2} />
                          {i.responseOverdue || overdueFor > 0 ? `Overdue · ${durationLabel(overdueFor)}` : `Respond in ${durationLabel(minutesBetween(now, due))}`}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div ref={detailRef} className="scroll-mt-20">
            {selected ? (
              <IncidentDetail key={selected.incidentId} incident={selected} now={now} onChange={(u, message) => { replace(u); toast(message); }} />
            ) : (
              <Card>
                <EmptyState icon="warning" title="Choose an incident">Pick one from the list to see the details.</EmptyState>
              </Card>
            )}
          </div>
        </div>
      )}
    </Stagger>
  );
}

function IncidentDetail({ incident, now, onChange }: { incident: Incident; now: Date; onChange: (updated: Incident, message: string) => void }) {
  const [what, setWhat] = useState("");
  const [outcome, setOutcome] = useState("");
  const [whatError, setWhatError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState(false);
  const next = nextIncidentStatus(incident.status);
  const due = parseLocal(incident.responseDueAt);

  async function addAction(e: React.FormEvent) {
    e.preventDefault();
    if (!what.trim()) {
      setWhatError("Describe what was done.");
      return;
    }
    setWhatError(null);
    setError(null);
    setAdding(true);
    try {
      const updated = await incidentApi.addAction(incident.incidentId, what.trim(), outcome.trim());
      setWhat("");
      setOutcome("");
      onChange(updated, "Action recorded");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAdding(false);
    }
  }

  async function advance() {
    if (!next) return;
    setError(null);
    setMoving(true);
    try {
      const updated = await incidentApi.setStatus(incident.incidentId, next.status);
      onChange(updated, `Moved to ${next.status === "IN_REVIEW" ? "In review" : next.status === "RESOLVED" ? "Resolved" : "Closed"}`);
    } catch (err) {
      setError(errorMessage(err)); // e.g. "Record at least one action before resolving the incident"
    } finally {
      setMoving(false);
    }
  }

  return (
    <Card aria-label="Incident details" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 flex flex-wrap items-center gap-2 text-[20px] font-extrabold tracking-[-0.01em]">
            {incidentTypeLabel[incident.incidentType]}
            <SeverityBadge severity={incident.severity} />
          </h2>
          <p className="m-0 text-[14px] text-muted">
            Reported by {incident.reportedByName} · {fmtDayMonth(incident.reportedAt)} {fmtTime(incident.reportedAt)}
          </p>
        </div>
        {incident.status === "REPORTED" && due && (
          <span className={cn("rounded-full px-3 py-1 text-[13px] font-bold", incident.responseOverdue ? "bg-danger-bg text-danger-ink" : "bg-tile text-ocean")}>
            {incident.responseOverdue ? `Overdue · ${durationLabel(minutesBetween(due, now))}` : `Respond by ${fmtTime(due)}`}
          </span>
        )}
      </div>

      <IncidentProgress status={incident.status} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-1">
          <span className="text-label font-bold tracking-label text-muted uppercase">Description</span>
          <p className="m-0 text-body text-ink">{incident.description}</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-label font-bold tracking-label text-muted uppercase">Location</span>
          <p className="m-0 text-body text-ink">{incident.location || "Not given"}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label font-bold tracking-label text-muted uppercase">Timeline</span>
        {incident.actions.length === 0 ? (
          <p className="m-0 text-[14px] text-muted">No actions recorded yet.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-0 p-0">
            {incident.actions.map((a, idx) => (
              <li key={a.actionId} className="relative flex gap-3 pb-4 last:pb-0">
                {idx < incident.actions.length - 1 && <span aria-hidden="true" className="absolute top-5 bottom-0 left-[7px] w-0.5 bg-divider" />}
                <span aria-hidden="true" className="relative mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] border-white bg-ocean shadow-card" />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px]">
                    <b>{a.handledByName}</b> <span className="text-muted">· {roleLabel(a.handledByRole)}</span>
                  </p>
                  <p className="m-0 text-[14px] text-ink">{a.actionTaken}</p>
                  {a.outcome && <p className="m-0 text-[13px] text-muted">Outcome: {a.outcome}</p>}
                  <p className="m-0 text-[12px] text-muted tabular-nums">
                    {fmtDayMonth(a.actionDate)} · {fmtTime(a.actionDate)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {incident.status !== "CLOSED" && (
        <form noValidate onSubmit={addAction} className="flex flex-col gap-4 rounded-control border border-line bg-off-white p-4">
          <span className="text-[14px] font-bold">Add action</span>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="What was done" error={whatError}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} maxLength={1000} placeholder="e.g. Applied an ice pack" value={what} onChange={(e) => setWhat(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field label="Outcome" optional>
              {({ id, describedBy }) => (
                <Input id={id} maxLength={500} placeholder="e.g. Swelling went down" value={outcome} onChange={(e) => setOutcome(e.target.value)} aria-describedby={describedBy} />
              )}
            </Field>
          </div>
          <Button type="submit" variant="ghost" icon="plus" loading={adding} className="self-start">
            Add action
          </Button>
        </form>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {next && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
          <p className="m-0 text-[13px] text-muted">
            {next.status === "RESOLVED" && incident.actions.length === 0 ? "Record at least one action before resolving." : "Incidents move one step at a time."}
          </p>
          <Button onClick={advance} loading={moving} iconRight="arrowRight">
            {next.label}
          </Button>
        </div>
      )}
    </Card>
  );
}
