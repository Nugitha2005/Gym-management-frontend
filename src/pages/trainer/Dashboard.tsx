import { Link } from "react-router";
import { bookingApi, checkInApi, incidentApi, loanApi } from "../../api/endpoints";
import { useUser } from "../../auth/AuthContext";
import { Badge } from "../../components/ui/Badge";
import { Card, CardHeader } from "../../components/ui/Card";
import { EmptyState, LoadError } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { slotLabel, slotTone } from "../../lib/domain";
import { firstName, fmtLongDate, fmtTime, greeting, isSameDay, parseLocal, relativeDay } from "../../lib/format";
import { Stagger } from "../../lib/motion";

const GYM_CAPACITY = 20; // CheckInService.MAX_GYM_CAPACITY

export default function TrainerDashboard() {
  const user = useUser();
  const now = useNow(60_000);
  const inside = useApi(checkInApi.inside, [], { refreshMs: 30_000 });
  const overdue = useApi(loanApi.overdue, [], { refreshMs: 60_000 });
  const queue = useApi(incidentApi.queue, [], { refreshMs: 60_000 });
  const sessions = useApi(bookingApi.upcoming);

  const capacity = inside.data?.capacityNow ?? GYM_CAPACITY;
  const free = inside.data ? Math.max(0, capacity - inside.data.peopleInside) : undefined;
  const oldestOverdue = [...(overdue.data ?? [])].sort((a, b) => a.dueTime.localeCompare(b.dueTime))[0];
  const openIncidents = (queue.data ?? []).filter((i) => i.status !== "CLOSED");
  const overdueIncidents = openIncidents.filter((i) => i.responseOverdue).length;
  const today = (sessions.data ?? []).filter((s) => isSameDay(parseLocal(s.startTime)!, now));
  const upcoming = today.length > 0 ? today : (sessions.data ?? []).slice(0, 4);

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        greeting
        eyebrow="Trainer · Front desk"
        title={`${greeting(now)}, ${firstName(user.name)}`}
        description={fmtLongDate(now)}
      />

      {!!(inside.error || overdue.error || queue.error) && (
        <LoadError error={inside.error ?? overdue.error ?? queue.error} onRetry={() => { void inside.reload(); void overdue.reload(); void queue.reload(); }} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        <StatCard
          to="/trainer/inside"
          label="People inside now"
          live
          value={inside.data?.peopleInside}
          suffix={`/ ${capacity}`}
          sub={free === undefined ? undefined : free === 0 ? "The gym is full" : `${free} ${free === 1 ? "place" : "places"} free`}
        />
        <StatCard
          to="/trainer/inside"
          label="Booked places not yet arrived"
          value={inside.data?.reservedNotArrived}
          sub="Held for members with a booking now"
        />
        <StatCard
          to="/trainer/loans"
          label="Overdue loans"
          tone="danger"
          value={overdue.data?.length}
          sub={oldestOverdue ? `Oldest was due at ${fmtTime(oldestOverdue.dueTime)}` : "Everything is back on time"}
        />
        <StatCard
          to="/trainer/incidents"
          label="Open incidents"
          tone="warning"
          value={queue.data ? openIncidents.length : undefined}
          sub={
            overdueIncidents > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Badge tone="danger" size="sm">{overdueIncidents} overdue</Badge>
                needs a response
              </span>
            ) : (
              "Nothing overdue"
            )
          }
        />
      </div>

      <Card aria-labelledby="today-title" className="flex flex-col gap-4">
        <CardHeader
          icon="calendar"
          title={today.length > 0 ? "Today’s upcoming sessions" : "Next sessions"}
          titleId="today-title"
          aside={
            <Link to="/trainer/sessions" className="text-[14px] font-bold">
              All sessions
            </Link>
          }
        />
        {sessions.loading && !sessions.data ? (
          <Skeleton className="h-32" />
        ) : sessions.error ? (
          <LoadError error={sessions.error} onRetry={() => sessions.reload()} />
        ) : upcoming.length === 0 ? (
          <EmptyState icon="calendar" title="No sessions scheduled">
            Create one from the Sessions page.
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-divider p-0">
            {upcoming.map((s) => (
              <li key={s.sessionId} className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex w-28 shrink-0 flex-col">
                  <span className="text-[20px] leading-tight font-extrabold tabular-nums">{fmtTime(s.startTime)}</span>
                  <span className="text-[13px] text-muted tabular-nums">
                    {today.length > 0 ? `to ${fmtTime(s.endTime)}` : relativeDay(s.startTime)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-bold">{s.title}</span>
                    <Badge tone={slotTone[s.slotType]} size="sm">
                      {slotLabel[s.slotType]}
                    </Badge>
                  </div>
                  <p className="m-0 text-[14px] text-muted">Instructor on duty: {s.instructor}</p>
                </div>
                <p className="m-0 text-[14px] text-muted tabular-nums">
                  <b className="text-ink">{s.bookedCount}</b> booked · <b className="text-ink">{s.heldCount}</b> held ·{" "}
                  <b className={s.availablePlaces > 0 ? "text-success-ink" : "text-danger-ink"}>{s.availablePlaces}</b> available
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Stagger>
  );
}
