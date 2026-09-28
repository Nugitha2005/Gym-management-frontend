import { useRef, useState } from "react";
import { errorMessage } from "../../api/client";
import { clearanceApi } from "../../api/endpoints";
import type { Clearance } from "../../api/types";
import { ClearanceBadge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Card, CardHeader, IconTile } from "../../components/ui/Card";
import { Field, Textarea } from "../../components/ui/Field";
import { LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { cn } from "../../lib/cn";
import { currentClearance, type ClearanceState } from "../../lib/domain";
import { daysUntil, fileSize, fmtDate } from "../../lib/format";
import { CountUp, Stagger } from "../../lib/motion";

// DocumentStorageService: PDF, JPG or PNG, up to 5 MB
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png"];
const NOTE_MAX = 500;

export default function Medical() {
  const toast = useToast();
  const clearances = useApi(clearanceApi.mine);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { state, clearance } = currentClearance(clearances.data);
  // MedicalClearanceService refuses a new form while one is pending or still valid
  const canUpload = state !== "PENDING" && state !== "APPROVED";

  function pick(f: File | undefined | null) {
    setSubmitError(null);
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      setFile(null);
      setFileError("Only PDF, JPG and PNG files are allowed.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setFileError(`That file is ${fileSize(f.size)}. The limit is 5 MB.`);
      return;
    }
    setFileError(null);
    setFile(f);
  }

  async function submit() {
    if (!file) {
      setFileError("Choose your medical form first.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await clearanceApi.submit(file, notes);
      toast("Form submitted. A doctor will review it.");
      setFile(null);
      setNotes("");
      if (inputRef.current) inputRef.current.value = "";
      await clearances.reload(true);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const history = [...(clearances.data ?? [])].sort((a, b) => b.clearanceId - a.clearanceId);

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Member · Medical"
        title="Medical clearance"
        description="A campus doctor must approve your medical form before you can use the gym."
      />

      {clearances.loading && !clearances.data ? (
        <Skeleton className="h-36 rounded-card" />
      ) : clearances.error ? (
        <LoadError error={clearances.error} onRetry={() => clearances.reload()} />
      ) : (
        <StatusCard state={state} clearance={clearance} />
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        <Card aria-labelledby="upload-title" className="flex flex-col gap-5">
          <CardHeader icon="upload" title="Upload a medical form" titleId="upload-title" />
          {!canUpload ? (
            <p className={cn("m-0 rounded-control p-4 text-[14px]", state === "PENDING" ? "bg-warning-bg text-warning-ink" : "bg-success-wash text-success-ink")}>
              {state === "PENDING"
                ? "Your form is waiting for a doctor. You can upload a new one once it has been reviewed."
                : `You're cleared until ${fmtDate(clearance?.expiryDate)}. You can upload a new form after it expires.`}
            </p>
          ) : (
            <>
              <input
                ref={inputRef}
                id="med-file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                className="sr-only"
                aria-describedby="med-file-rules"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              {!file ? (
                <label
                  htmlFor="med-file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pick(e.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-3 rounded-[14px] border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragging ? "border-ocean bg-tile" : fileError ? "border-danger bg-danger-hover" : "border-line-strong bg-off-white hover:border-ocean hover:bg-tile",
                  )}
                >
                  <IconTile icon="upload" size={48} />
                  <span className="text-body font-semibold text-ink">
                    Drag and drop your form here, or <span className="text-ocean underline underline-offset-4">browse</span>
                  </span>
                  <span id="med-file-rules" className="text-[13px] text-muted">
                    PDF, JPG or PNG · up to 5 MB
                  </span>
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-control border border-line bg-off-white p-3.5">
                  <IconTile icon="file" size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[15px] font-bold">{file.name}</p>
                    <p className="m-0 text-[13px] text-muted">{fileSize(file.size)}</p>
                  </div>
                  <IconButton
                    icon="close"
                    label="Remove file"
                    onClick={() => {
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                  />
                </div>
              )}
              {fileError && (
                <p role="alert" className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-danger-text">
                  <Icon name="alert" size={16} strokeWidth={2} />
                  {fileError}
                </p>
              )}
              <Field label="Note for the doctor" optional aside={`${notes.length} / ${NOTE_MAX}`}>
                {({ id, describedBy }) => (
                  <Textarea
                    id={id}
                    rows={3}
                    maxLength={NOTE_MAX}
                    placeholder="Anything the doctor should know, e.g. a recent injury"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    aria-describedby={describedBy}
                  />
                )}
              </Field>
              {submitError && (
                <p role="alert" className="m-0 text-[13px] font-semibold text-danger-text">
                  {submitError}
                </p>
              )}
              <Button size="lg" onClick={submit} loading={submitting} className="self-start">
                Submit for review
              </Button>
            </>
          )}
        </Card>

        <Card aria-labelledby="history-title" className="flex flex-col gap-4">
          <CardHeader icon="clock" title="History" titleId="history-title" />
          {history.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">No forms submitted yet.</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {history.map((c) => (
                <li key={c.clearanceId} className="flex flex-col gap-2 rounded-control border border-line p-4">
                  <div className="flex items-center justify-between gap-3">
                    <ClearanceBadge status={c.status} />
                    <span className="text-[13px] text-muted tabular-nums">Submitted {fmtDate(c.submittedDate)}</span>
                  </div>
                  {c.reviewedByName && (
                    <p className="m-0 text-[13px] text-muted">
                      Reviewed by <span className="font-semibold text-ink">{c.reviewedByName}</span>
                      {c.reviewedDate && ` on ${fmtDate(c.reviewedDate)}`}
                    </p>
                  )}
                  {c.status === "APPROVED" && c.expiryDate && (
                    <p className="m-0 text-[13px] text-muted">
                      {daysUntil(c.expiryDate) < 0 ? "Expired" : "Valid until"} <span className="font-semibold text-ink">{fmtDate(c.expiryDate)}</span>
                    </p>
                  )}
                  {c.rejectionReason && (
                    <p className="m-0 text-[13px] text-ink">
                      <span className="font-semibold">Doctor’s reason:</span> {c.rejectionReason}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </Stagger>
  );
}

function StatusCard({ state, clearance }: { state: ClearanceState; clearance: Clearance | null }) {
  const view: Record<ClearanceState, { icon: "shieldCheck" | "hourglass" | "alert" | "shieldPlus"; tone: "success" | "orange" | "danger" | "ocean"; title: string; body: React.ReactNode }> = {
    APPROVED: {
      icon: "shieldCheck",
      tone: "success",
      title: "You are cleared to use the gym",
      body: clearance?.reviewedByName ? `Reviewed by ${clearance.reviewedByName} on ${fmtDate(clearance.reviewedDate)}` : null,
    },
    PENDING: {
      icon: "hourglass",
      tone: "orange",
      title: "A doctor is reviewing your form",
      body: clearance ? `Submitted ${fmtDate(clearance.submittedDate)}. You'll see the result here.` : null,
    },
    REJECTED: {
      icon: "alert",
      tone: "danger",
      title: "Your last form was not accepted",
      body: clearance?.rejectionReason ? `Doctor’s reason: ${clearance.rejectionReason} Upload a new one below.` : "Upload a new one below.",
    },
    REVOKED: {
      icon: "alert",
      tone: "danger",
      title: "Your clearance was revoked",
      body: clearance?.rejectionReason ? `Reason: ${clearance.rejectionReason} Upload a new form below.` : "Upload a new form below.",
    },
    EXPIRED: {
      icon: "alert",
      tone: "danger",
      title: "Your clearance has expired",
      body: `It ended on ${fmtDate(clearance?.expiryDate)}. Upload a new form below.`,
    },
    NONE: { icon: "shieldPlus", tone: "ocean", title: "No medical form on file", body: "Upload one below before your first visit." },
  };
  const v = view[state];
  const days = state === "APPROVED" && clearance?.expiryDate ? Math.max(0, daysUntil(clearance.expiryDate)) : null;
  return (
    <Card aria-label="Current status" className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <IconTile icon={v.icon} tone={v.tone} size={56} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <ClearanceBadge status={state === "EXPIRED" ? "REVOKED" : state} className="self-start">
          {state === "APPROVED" && clearance?.expiryDate ? `Approved until ${fmtDate(clearance.expiryDate)}` : state === "EXPIRED" ? "Expired" : undefined}
        </ClearanceBadge>
        <h2 className="m-0 text-status font-bold text-ink">{v.title}</h2>
        {v.body && <p className="m-0 text-[14px] text-muted">{v.body}</p>}
      </div>
      {days !== null && (
        <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
          <CountUp value={days} className="text-[44px] leading-none font-extrabold text-ink" />
          <span className="text-[14px] font-semibold text-muted">days left</span>
        </div>
      )}
    </Card>
  );
}
