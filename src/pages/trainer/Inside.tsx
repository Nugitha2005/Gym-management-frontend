import { useState } from "react";
import { errorMessage } from "../../api/client";
import { checkInApi } from "../../api/endpoints";
import type { CheckInRecord, EntryType } from "../../api/types";
import { Badge, LiveDot } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { cn } from "../../lib/cn";
import { durationLabel, fmtTime, minutesBetween, parseLocal } from "../../lib/format";
import { CountUp, Stagger } from "../../lib/motion";

const GYM_CAPACITY = 20;
const entryLabel: Record<EntryType, string> = { BOOKED: "Booked", WALK_IN: "Walk-in", MANUAL: "Manual" };

export default function Inside() {
  const toast = useToast();
  const now = useNow(30_000);
  const inside = useApi(checkInApi.inside, [], { refreshMs: 20_000 });
  const [target, setTarget] = useState<CheckInRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const count = inside.data?.peopleInside ?? 0;
  const capacity = inside.data?.capacityNow ?? GYM_CAPACITY;
  const free = Math.max(0, capacity - count);
  const records = [...(inside.data?.records ?? [])].sort((a, b) => Number(b.overstayed) - Number(a.overstayed) || a.entryTime.localeCompare(b.entryTime));

  async function forceCheckout() {
    if (!target) return;
    setBusy(true);
    setActionError(null);
    try {
      await checkInApi.forceCheckout(target.recordId);
      toast(`${target.userName} checked out`);
      setTarget(null);
      await inside.reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<CheckInRecord>[] = [
    { key: "name", header: "Name", width: "1.5fr", primary: true, render: (r) => <span className="font-semibold">{r.userName}</span> },
    { key: "uid", header: "University ID", width: "1fr", render: (r) => r.universityId },
    {
      key: "entry",
      header: "Entry",
      width: "0.9fr",
      render: (r) => {
        const since = parseLocal(r.entryTime);
        return (
          <span>
            {fmtTime(r.entryTime)}
            {since && <span className="block text-[12px] text-muted">{durationLabel(minutesBetween(since, now))}</span>}
          </span>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      width: "0.8fr",
      render: (r) => (
        <Badge tone={r.entryType === "BOOKED" ? "info" : r.entryType === "MANUAL" ? "warning" : "neutral"} size="sm" dot={false}>
          {entryLabel[r.entryType]}
        </Badge>
      ),
    },
    { key: "session", header: "Session", width: "1.3fr", render: (r) => r.sessionTitle ?? <span className="text-muted">—</span> },
    {
      key: "status",
      header: "Status",
      width: "0.9fr",
      render: (r) => (r.overstayed ? <Badge tone="danger" size="sm">Overstayed</Badge> : <Badge tone="success" size="sm">Inside</Badge>),
    },
    {
      key: "action",
      header: "Action",
      width: "150px",
      align: "right",
      hideLabelOnMobile: true,
      render: (r) => (
        <Button
          variant="danger"
          size="sm"
          className="w-full md:w-auto"
          aria-label={`Force check-out ${r.userName}`}
          onClick={() => {
            setActionError(null);
            setTarget(r);
          }}
        >
          Force check-out
        </Button>
      ),
    },
  ];

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk · Live"
        title="Who’s inside"
        description="Everyone checked in to the gym right now. Booked members are flagged 10 minutes after their session ends; forgotten check-outs close automatically after 4 hours."
      />

      <Card aria-label="Capacity" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-[12px] font-bold tracking-label text-success-ink uppercase">
              <LiveDot className="h-2 w-2" /> Live
            </span>
            <p className="m-0 flex items-baseline gap-2">
              {inside.data ? <CountUp value={count} className="text-[44px] leading-none font-extrabold" /> : <Skeleton className="h-11 w-16" />}
              <span className="text-[18px] font-bold text-muted">of {capacity} inside</span>
            </p>
          </div>
          <p className={cn("m-0 text-[15px] font-bold", free === 0 ? "text-danger-ink" : "text-success-ink")} aria-live="polite">
            {free === 0 ? "The gym is full" : `${free} ${free === 1 ? "place" : "places"} free`}
          </p>
        </div>
        <div role="meter" aria-label="Gym capacity" aria-valuemin={0} aria-valuemax={capacity} aria-valuenow={count} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${capacity}, minmax(0, 1fr))` }}>
          {Array.from({ length: capacity }, (_, i) => (
            <span key={i} className={cn("h-3.5 rounded-[5px] transition-colors duration-500 sm:h-5", i < count ? (count >= capacity ? "bg-danger" : "bg-ocean") : "bg-track")} />
          ))}
        </div>
      </Card>

      <Card aria-labelledby="people-title" className="flex flex-col gap-4">
        <CardHeader icon="people" title="People inside" titleId="people-title" aside={<span className="text-[14px] font-semibold text-muted tabular-nums">{records.length}</span>} />
        {inside.loading && !inside.data ? (
          <Skeleton className="h-40" />
        ) : inside.error ? (
          <LoadError error={inside.error} onRetry={() => inside.reload()} />
        ) : (
          <DataTable
            label="People inside"
            columns={columns}
            rows={records}
            rowKey={(r) => r.recordId}
            rowTone={(r) => (r.overstayed ? "danger" : undefined)}
            empty={<EmptyState icon="people" title="Nobody is inside">The gym is empty right now.</EmptyState>}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={forceCheckout}
        loading={busy}
        danger
        title={`Check out ${target?.userName ?? ""}?`}
        confirmLabel="Force check-out"
        cancelLabel="Keep checked in"
      >
        <p className="m-0">Use this when a member left without scanning out. Their visit will end now.</p>
        {actionError && (
          <p role="alert" className="m-0 mt-3 font-semibold text-danger-text">
            {actionError}
          </p>
        )}
      </ConfirmDialog>
    </Stagger>
  );
}
