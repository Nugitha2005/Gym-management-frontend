import { useEffect, useRef, useState } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { clearanceApi } from "../../api/endpoints";
import type { Clearance } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { Alert, EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton, Spinner } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/cn";
import { daysUntil, fileSize, fmtDate, fmtDayMonth, plural, toLocalDate } from "../../lib/format";
import { Stagger } from "../../lib/motion";

const REASON_MAX = 500; // ClearanceRejectRequestDto

function oneYearFromToday() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** 24_Doctor_Clearance_reviews: pending forms oldest first, document preview, approve with an expiry or reject with a reason. */
export default function ClearanceReviews() {
  const toast = useToast();
  const wide = useMediaQuery("(min-width: 1024px)");
  const pending = useApi(clearanceApi.pending, [], { refreshMs: 60_000 });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const list = [...(pending.data ?? [])].sort((a, b) => a.submittedDate.localeCompare(b.submittedDate) || a.clearanceId - b.clearanceId);
  const selected = list.find((c) => c.clearanceId === selectedId) ?? (wide ? list[0] : undefined);

  function select(id: number) {
    setSelectedId(id);
    if (!wide) window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function done(c: Clearance, message: string) {
    toast(message);
    const index = list.findIndex((x) => x.clearanceId === c.clearanceId);
    const next = list[index + 1] ?? list[index - 1];
    pending.setData((items) => (items ?? []).filter((x) => x.clearanceId !== c.clearanceId));
    setSelectedId(next ? next.clearanceId : null);
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader eyebrow="Doctor · Reviews" title="Clearance reviews" description="Pending medical forms, oldest first. Members can use the gym once you approve." />

      {pending.loading && !pending.data ? (
        <Skeleton className="h-80 rounded-card" />
      ) : pending.error ? (
        <LoadError error={pending.error} onRetry={() => pending.reload()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="checkCircle" title="All caught up">
            No forms are waiting for review.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(280px,0.8fr)_1.6fr] lg:gap-6">
          <Card padding="none" aria-label="Pending forms" className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
              <span className="text-[14px] font-bold">Pending</span>
              <Badge tone="warning" size="sm">{list.length}</Badge>
            </div>
            <ul className="m-0 flex list-none flex-col p-2">
              {list.map((c) => {
                const age = -daysUntil(c.submittedDate);
                const active = selected?.clearanceId === c.clearanceId;
                return (
                  <li key={c.clearanceId}>
                    <button
                      type="button"
                      onClick={() => select(c.clearanceId)}
                      aria-current={active || undefined}
                      className={cn("press flex w-full flex-col gap-1 rounded-control border px-3.5 py-3 text-left", active ? "border-ocean bg-tile" : "border-transparent hover:bg-ghost-hover")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[15px] font-bold text-ink">{c.studentName}</span>
                        <span className={cn("text-[12px] font-bold", age >= 3 ? "text-orange-ink" : "text-muted")}>{age <= 0 ? "Today" : `${plural(age, "day")} ago`}</span>
                      </span>
                      <span className="text-[13px] text-muted tabular-nums">
                        {c.universityId} · submitted {fmtDayMonth(c.submittedDate)}
                      </span>
                      {c.notes && <span className="truncate text-[13px] text-ink/80">“{c.notes}”</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
          <div ref={panelRef} className="scroll-mt-20">
            {selected ? (
              <ReviewPanel key={selected.clearanceId} clearance={selected} onDone={done} />
            ) : (
              <Card>
                <EmptyState icon="file" title="Choose a form">Pick a member from the list to review their form.</EmptyState>
              </Card>
            )}
          </div>
        </div>
      )}
    </Stagger>
  );
}

function DocumentPreview({ clearanceId }: { clearanceId: number }) {
  const [doc, setDoc] = useState<{ url: string; type: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    clearanceApi
      .document(clearanceId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setDoc({ url, type: blob.type, size: blob.size });
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [clearanceId]);

  if (error) return <Alert tone="danger" title="Couldn't open the form">{error}</Alert>;
  if (!doc) {
    return (
      <div className="flex h-72 items-center justify-center rounded-control border border-line bg-off-white text-muted">
        <Spinner size={24} />
        <span className="sr-only">Loading the form…</span>
      </div>
    );
  }
  const isPdf = doc.type.includes("pdf");
  const label = isPdf ? "PDF" : doc.type.includes("png") ? "PNG image" : doc.type.includes("svg") ? "Image" : "JPG image";
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="overflow-hidden rounded-control border border-line bg-off-white">
        {isPdf ? (
          <object data={doc.url} type="application/pdf" aria-label="Medical form" className="h-[480px] w-full">
            <p className="p-4 text-[14px]">
              This browser can’t show PDFs here. <a href={doc.url} target="_blank" rel="noreferrer">Open the form</a>.
            </p>
          </object>
        ) : (
          <img src={doc.url} alt="Member's medical form" className="max-h-[520px] w-full object-contain" />
        )}
      </div>
      <figcaption className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="file" size={16} />
          {label} · {fileSize(doc.size)}
        </span>
        <a href={doc.url} target="_blank" rel="noreferrer" className="font-bold">
          Open full size
        </a>
      </figcaption>
    </figure>
  );
}

function ReviewPanel({ clearance, onDone }: { clearance: Clearance; onDone: (c: Clearance, message: string) => void }) {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const maxDate = oneYearFromToday();
  const [expiry, setExpiry] = useState(toLocalDate(maxDate));
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  async function approve() {
    if (!expiry || expiry < toLocalDate(tomorrow)) {
      setFieldError("Expiry date must be in the future");
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true);
    try {
      await clearanceApi.approve(clearance.clearanceId, expiry);
      onDone(clearance, `${clearance.studentName} is cleared until ${fmtDate(expiry)}`);
    } catch (err) {
      setError(err instanceof ApiError && err.fieldErrors.expiryDate ? err.fieldErrors.expiryDate : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reason.trim()) {
      setFieldError("Rejection reason is required");
      return;
    }
    setFieldError(null);
    setError(null);
    setBusy(true);
    try {
      await clearanceApi.reject(clearance.clearanceId, reason.trim());
      onDone(clearance, `Form from ${clearance.studentName} rejected`);
    } catch (err) {
      setError(err instanceof ApiError && err.fieldErrors.reason ? err.fieldErrors.reason : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card aria-label="Review panel" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">{clearance.studentName}</h2>
          <p className="m-0 text-[14px] text-muted tabular-nums">
            {clearance.universityId} · submitted {fmtDate(clearance.submittedDate)}
          </p>
        </div>
        <Badge tone="warning">Pending</Badge>
      </div>

      {clearance.notes && (
        <div className="flex flex-col gap-1 rounded-control bg-off-white p-4">
          <span className="text-label font-bold tracking-label text-muted uppercase">Member’s note</span>
          <p className="m-0 text-body">{clearance.notes}</p>
        </div>
      )}

      <DocumentPreview clearanceId={clearance.clearanceId} />

      <div className="flex flex-col gap-4 border-t border-divider pt-5">
        <ChoiceGroup
          label="Decision"
          columns={2}
          value={decision}
          onChange={(v) => {
            setDecision(v);
            setFieldError(null);
            setError(null);
          }}
          options={[
            { value: "APPROVE", label: "Approve", dot: "bg-success" },
            { value: "REJECT", label: "Reject", dot: "bg-danger" },
          ]}
        />

        {decision === "APPROVE" && (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field label="Clearance valid until" className="flex-1" error={fieldError} hint={`At most one year ahead (${fmtDate(maxDate)}).`}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="date" min={toLocalDate(tomorrow)} max={toLocalDate(maxDate)} value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Button size="lg" icon="check" loading={busy} onClick={approve} className="h-12 sm:mt-[30px]">
              Approve clearance
            </Button>
          </div>
        )}

        {decision === "REJECT" && (
          <div className="flex flex-col gap-4">
            <Field label={<>Reason <span className="font-medium text-muted">(the member will see this)</span></>} aside={`${reason.length} / ${REASON_MAX}`} error={fieldError}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} rows={3} maxLength={REASON_MAX} placeholder="e.g. The form is missing the doctor’s signature and stamp." value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Button variant="danger-solid" size="lg" loading={busy} onClick={reject} className="self-start">
              Reject form
            </Button>
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
      </div>
    </Card>
  );
}
