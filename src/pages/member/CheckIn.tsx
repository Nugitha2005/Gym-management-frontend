import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { errorMessage } from "../../api/client";
import { checkInApi } from "../../api/endpoints";
import type { CheckInRecord, CheckInResult, EntryType } from "../../api/types";
import { QrScanner } from "../../components/domain/QrScanner";
import { Badge, LiveDot } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, IconTile } from "../../components/ui/Card";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { Field, Input } from "../../components/ui/Field";
import { EmptyState, LoadError } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { durationLabel, fmtDayMonth, fmtTime } from "../../lib/format";
import { Stagger } from "../../lib/motion";

const CODE_FORMAT = /^GYM-[A-Z0-9]{8}$/i; // GymAccessCodeService: "GYM-" + 8 letters/numbers

type Outcome =
  | { kind: "entered" | "exited"; result: CheckInResult }
  | { kind: "error"; title: string; detail: React.ReactNode };

/** Turn a backend refusal into the result panels from 07_Check_in. */
function describeError(message: string): { title: string; detail: React.ReactNode } {
  if (/clearance/i.test(message)) {
    return {
      title: "A valid medical clearance is required",
      detail: (
        <>
          Upload your form under <Link to="/member/medical">Medical clearance</Link>.
        </>
      ),
    };
  }
  if (/full|capacity/i.test(message)) {
    return {
      title: "The gym is full right now. Please book a slot.",
      detail: (
        <>
          See open places in <Link to="/member/sessions">Sessions</Link>.
        </>
      ),
    };
  }
  if (/access hours/i.test(message)) {
    return { title: "Outside your access hours", detail: "Students can use the gym from 08:00 to 17:30. University staff can stay until 22:00." };
  }
  if (/invalid qr|not valid/i.test(message)) {
    return { title: "That code is not valid", detail: "Codes look like GYM- followed by 8 letters or numbers." };
  }
  return { title: "Couldn't check you in", detail: message };
}

const entryLabel: Record<EntryType, string> = { BOOKED: "Booked", WALK_IN: "Walk-in", MANUAL: "Manual" };

export default function CheckIn() {
  const reduce = useReducedMotion();
  const visits = useApi(checkInApi.myHistory);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function submit(raw: string) {
    const value = raw.trim().toUpperCase();
    if (!CODE_FORMAT.test(value)) {
      setOutcome({ kind: "error", ...describeError("not valid") });
      return false;
    }
    setBusy(true);
    try {
      const result = await checkInApi.scan(value);
      setOutcome({ kind: result.outcome === "EXITED" ? "exited" : "entered", result });
      void visits.reload(true);
      return true;
    } catch (err) {
      setOutcome({ kind: "error", ...describeError(errorMessage(err)) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onTyped(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setCodeError("Type the code printed under the QR code.");
      return;
    }
    setCodeError(null);
    if (await submit(code)) setCode("");
  }

  const rows = visits.data ?? [];
  const shown = showAll ? rows : rows.slice(0, 8);
  const columns: Column<CheckInRecord>[] = [
    { key: "date", header: "Date", width: "1.1fr", primary: true, render: (r) => fmtDayMonth(r.entryTime) },
    { key: "entry", header: "Entry", width: "0.8fr", render: (r) => fmtTime(r.entryTime) },
    { key: "exit", header: "Exit", width: "0.8fr", render: (r) => (r.exitTime ? fmtTime(r.exitTime) : "—") },
    {
      key: "duration",
      header: "Duration",
      width: "1.1fr",
      render: (r) =>
        r.insideNow ? (
          <span className="inline-flex items-center gap-2 font-semibold text-success-ink">
            <LiveDot className="h-2 w-2" /> In the gym
          </span>
        ) : (
          <>
            {durationLabel(r.durationMinutes)}
            {r.autoClosed && <span className="ml-1.5 text-[12px] text-muted">(closed automatically)</span>}
          </>
        ),
    },
    {
      key: "type",
      header: "Type",
      width: "0.9fr",
      render: (r) => (
        <Badge tone={r.entryType === "BOOKED" ? "info" : r.entryType === "MANUAL" ? "warning" : "neutral"} size="sm" dot={false}>
          {entryLabel[r.entryType]}
        </Badge>
      ),
    },
  ];

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Member · Check in"
        title="Check in"
        description="Scan the QR code at the gym door. Scan again when you leave to check out."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
        <Card aria-labelledby="scan-title" className="flex flex-col gap-5">
          <CardHeader icon="scan" title="Scan the gym QR code" titleId="scan-title" />
          <QrScanner onCode={(c) => void submit(c)} busy={busy} />
          <div className="h-px bg-divider" />
          <form noValidate onSubmit={onTyped} aria-labelledby="type-title" className="flex flex-col gap-3">
            <h2 id="type-title" className="m-0 text-card-title font-bold">
              Type the code instead
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Field
                label="Gym code"
                className="flex-1"
                error={codeError}
                hint="It is printed under the QR code, e.g. GYM-4F7K2Q9A."
              >
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="GYM-XXXXXXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    className="font-semibold tracking-[0.06em]"
                  />
                )}
              </Field>
              <Button type="submit" variant="secondary" size="lg" className="h-12 sm:mt-[30px]" loading={busy}>
                Submit code
              </Button>
            </div>
          </form>
        </Card>

        <Card aria-labelledby="result-title" aria-live="polite" className="flex min-h-[260px] flex-col gap-4">
          <h2 id="result-title" className="sr-only">
            Result
          </h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={outcome ? (outcome.kind === "error" ? outcome.title : outcome.result.record?.recordId ?? outcome.kind) : "idle"}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-1 flex-col"
            >
              <ResultPanel outcome={outcome} />
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      <Card aria-labelledby="visits-title" className="flex flex-col gap-4">
        <CardHeader
          icon="clock"
          title="My visits"
          titleId="visits-title"
          aside={<span className="text-[14px] font-semibold text-muted tabular-nums">{rows.length} {rows.length === 1 ? "visit" : "visits"}</span>}
        />
        {visits.loading && !visits.data ? (
          <Skeleton className="h-32" />
        ) : visits.error ? (
          <LoadError error={visits.error} onRetry={() => visits.reload()} />
        ) : (
          <>
            <DataTable
              label="My visits"
              columns={columns}
              rows={shown}
              rowKey={(r) => r.recordId}
              empty={<EmptyState icon="door" title="No visits yet">Your check-ins and check-outs will be listed here.</EmptyState>}
            />
            {rows.length > 8 && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show fewer" : `Show all ${rows.length} visits`}
              </Button>
            )}
          </>
        )}
      </Card>
    </Stagger>
  );
}

function ResultPanel({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <IconTile icon="door" size={56} />
        <p className="m-0 text-status font-bold">Ready when you are</p>
        <p className="m-0 max-w-[260px] text-[14px] text-muted">Your result shows here after you scan.</p>
      </div>
    );
  }
  if (outcome.kind === "error") {
    return (
      <div role="alert" className="flex flex-1 flex-col justify-center gap-3 rounded-control bg-danger-hover p-5">
        <IconTile icon="alert" tone="danger" size={48} />
        <p className="m-0 text-status font-bold text-danger-ink">{outcome.title}</p>
        <p className="m-0 text-[14px] text-ink/80">{outcome.detail}</p>
      </div>
    );
  }
  const r = outcome.result.record;
  const entered = outcome.kind === "entered";
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 rounded-control bg-success-wash p-5">
      <IconTile icon={entered ? "check" : "logout"} tone="success" size={48} />
      <p className="m-0 text-status font-bold text-ink">
        {entered
          ? r?.sessionTitle
            ? `Welcome, booking for ${r.sessionTitle}`
            : "Welcome to the gym!"
          : "Goodbye, you have checked out"}
      </p>
      <p className="m-0 text-[14px] text-muted tabular-nums">
        {entered ? `Checked in at ${fmtTime(r?.entryTime)}` : `Checked out at ${fmtTime(r?.exitTime)}`}
        {!entered && r && r.durationMinutes > 0 && ` · ${durationLabel(r.durationMinutes)}`}
      </p>
    </div>
  );
}
