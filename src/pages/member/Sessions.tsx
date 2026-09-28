import { useMemo, useState } from "react";
import { Link } from "react-router";
import { errorMessage } from "../../api/client";
import { bookingApi } from "../../api/endpoints";
import type { TrainingSession } from "../../api/types";
import { SessionCard } from "../../components/domain/SessionCard";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { hasStarted } from "../../lib/domain";
import { fmtLongDate, parseLocal, relativeDay } from "../../lib/format";
import { Rise, Stagger } from "../../lib/motion";

export default function Sessions() {
  const toast = useToast();
  const sessions = useApi(bookingApi.upcoming);
  const bookings = useApi(bookingApi.mine);
  const waitlist = useApi(bookingApi.myWaitlist);
  const [pending, setPending] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  const bookedIds = new Set((bookings.data ?? []).filter((b) => b.status === "CONFIRMED").map((b) => b.sessionId));
  const waitingIds = new Set((waitlist.data ?? []).filter((w) => w.status === "WAITING").map((w) => w.sessionId));
  const offeredIds = new Set((waitlist.data ?? []).filter((w) => w.status === "OFFERED").map((w) => w.sessionId));

  // Group by day: "Today", "Tomorrow", "Tue 29 Sep"
  const groups = useMemo(() => {
    const list = (sessions.data ?? []).filter((s) => !s.cancelled).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const map = new Map<string, { label: string; date: Date; items: TrainingSession[] }>();
    for (const s of list) {
      const d = parseLocal(s.startTime)!;
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, { label: relativeDay(d), date: d, items: [] });
      map.get(key)!.items.push(s);
    }
    return [...map.values()];
  }, [sessions.data]);

  async function book(session: TrainingSession) {
    setPending(session.sessionId);
    setErrors((e) => ({ ...e, [session.sessionId]: "" }));
    try {
      const result = await bookingApi.book(session.sessionId);
      if (result.outcome === "BOOKED") toast(`Booked: ${session.title}`);
      else if (result.outcome === "WAITLISTED") toast("Session full — you're on the waitlist", "info");
      else setErrors((e) => ({ ...e, [session.sessionId]: result.message }));
      await Promise.all([sessions.reload(true), bookings.reload(true), waitlist.reload(true)]);
    } catch (err) {
      setErrors((e) => ({ ...e, [session.sessionId]: errorMessage(err) }));
    } finally {
      setPending(null);
    }
  }

  function footer(s: TrainingSession) {
    const error = errors[s.sessionId];
    let action: React.ReactNode;
    if (bookedIds.has(s.sessionId)) {
      action = (
        <div className="flex items-center justify-between gap-3">
          <Badge tone="success">You are booked</Badge>
          <Link to="/member/bookings" className="text-[14px] font-bold">
            My bookings
          </Link>
        </div>
      );
    } else if (offeredIds.has(s.sessionId)) {
      action = (
        <div className="flex items-center justify-between gap-3">
          <Badge tone="orange">Place offered</Badge>
          <Link to="/member/bookings" className="text-[14px] font-bold">
            Accept it
          </Link>
        </div>
      );
    } else if (waitingIds.has(s.sessionId)) {
      action = <Badge tone="warning" className="self-start">On the waitlist</Badge>;
    } else if (hasStarted(s.startTime)) {
      action = <p className="m-0 text-[14px] font-semibold text-muted">This session has started.</p>;
    } else if (s.availablePlaces > 0) {
      action = (
        <Button block onClick={() => book(s)} loading={pending === s.sessionId} disabled={pending !== null && pending !== s.sessionId}>
          Book
        </Button>
      );
    } else {
      action = (
        <Button block variant="ghost" onClick={() => book(s)} loading={pending === s.sessionId} disabled={pending !== null && pending !== s.sessionId}>
          Join waitlist
        </Button>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        {action}
        {error && (
          <p role="alert" className="m-0 text-[13px] font-semibold text-danger-text">
            {error}
          </p>
        )}
      </div>
    );
  }

  const loading = sessions.loading && !sessions.data;
  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Member · Sessions"
        title="Sessions"
        description="Book a place in an upcoming session. Each session holds up to 10 people. When a session is full, join the waitlist and we'll offer you the next free place."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-64 rounded-card" />
          ))}
        </div>
      ) : sessions.error ? (
        <LoadError error={sessions.error} onRetry={() => sessions.reload()} />
      ) : groups.length === 0 ? (
        <Rise className="rounded-card border border-line bg-white shadow-card">
          <EmptyState icon="calendar" title="No upcoming sessions">
            Trainers haven't scheduled any sessions yet. Walk-ins are welcome during your access hours.
          </EmptyState>
        </Rise>
      ) : (
        groups.map((group) => (
          <section key={group.date.toDateString()} aria-label={group.label} className="flex flex-col gap-3">
            <Rise as="h2" className="m-0 flex items-baseline gap-2 text-[15px] font-bold text-ink">
              {group.label}
              {(group.label === "Today" || group.label === "Tomorrow") && (
                <span className="text-[14px] font-medium text-muted">{fmtLongDate(group.date)}</span>
              )}
            </Rise>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.items.map((s) => (
                <SessionCard key={s.sessionId} session={s} footer={footer(s)} />
              ))}
            </div>
          </section>
        ))
      )}
    </Stagger>
  );
}
