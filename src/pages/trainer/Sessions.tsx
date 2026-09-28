import { useState } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { bookingApi } from "../../api/endpoints";
import type { SlotType, TrainingSession } from "../../api/types";
import { useUser } from "../../auth/AuthContext";
import { DateTile } from "../../components/domain/DateTile";
import { Badge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { ConfirmDialog, Sheet } from "../../components/ui/Dialog";
import { Field, Input } from "../../components/ui/Field";
import { Alert, EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { slotLabel, slotTone } from "../../lib/domain";
import { relativeDay, timeRange, toLocalDateTime } from "../../lib/format";
import { Stagger } from "../../lib/motion";

const MAX_BOOKABLE = 10; // TrainingSessionRequestDto: @Max(10)

/** "2026-09-27T17:30" for <input type="datetime-local"> */
function inputValue(d: Date) {
  return toLocalDateTime(d).slice(0, 16);
}

function defaultTimes() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);
  const end = new Date(start.getTime() + 90 * 60000);
  return { start: inputValue(start), end: inputValue(end) };
}

export default function TrainerSessions() {
  const user = useUser();
  const toast = useToast();
  const sessions = useApi(bookingApi.upcoming);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<TrainingSession | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError(null);
    try {
      await bookingApi.cancelSession(cancelTarget.sessionId);
      toast(`${cancelTarget.title} cancelled`);
      setCancelTarget(null);
      await sessions.reload(true);
    } catch (err) {
      setCancelError(errorMessage(err));
    } finally {
      setCancelBusy(false);
    }
  }

  const list = [...(sessions.data ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk · Sessions"
        title="Sessions"
        description="Upcoming sessions. Held places are kept for members with a waitlist offer."
        actions={
          <Button icon="plus" onClick={() => setSheetOpen(true)}>
            Create session
          </Button>
        }
      />

      {sessions.loading && !sessions.data ? (
        <Skeleton className="h-64 rounded-card" />
      ) : sessions.error ? (
        <LoadError error={sessions.error} onRetry={() => sessions.reload()} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="calendar" title="No upcoming sessions" action={<Button variant="outline" size="sm" icon="plus" onClick={() => setSheetOpen(true)}>Create session</Button>}>
            Sessions you create appear here and on members’ Sessions page.
          </EmptyState>
        </Card>
      ) : (
        <Card padding="none" aria-label="Upcoming sessions" className="divide-y divide-divider">
          {list.map((s) => (
            <div key={s.sessionId} className="flex flex-col gap-4 p-4 sm:px-6 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <DateTile value={s.startTime} />
                <div className="min-w-0">
                  <p className="m-0 text-[13px] font-semibold text-muted tabular-nums">
                    {relativeDay(s.startTime)} · {timeRange(s.startTime, s.endTime)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-bold">{s.title}</span>
                    <Badge tone={slotTone[s.slotType]} size="sm">
                      {slotLabel[s.slotType]}
                    </Badge>
                  </div>
                  <p className="m-0 text-[14px] text-muted">
                    Instructor: {s.instructor} · capacity {s.maxCapacity}
                  </p>
                </div>
              </div>
              <dl className="m-0 grid grid-cols-3 gap-2 text-center md:w-[260px]">
                {[
                  ["Booked", s.bookedCount, "text-ink"],
                  ["Held", s.heldCount, "text-orange-ink"],
                  ["Available", s.availablePlaces, s.availablePlaces > 0 ? "text-success-ink" : "text-danger-ink"],
                ].map(([label, value, tone]) => (
                  <div key={label as string} className="flex flex-col-reverse rounded-control bg-off-white px-2 py-2">
                    <dt className="text-[12px] font-semibold text-muted">{label}</dt>
                    <dd className={`m-0 text-[20px] leading-tight font-extrabold tabular-nums ${tone}`}>{value}</dd>
                  </div>
                ))}
              </dl>
              <Button variant="danger" size="sm" onClick={() => { setCancelError(null); setCancelTarget(s); }} className="self-start md:self-center">
                Cancel session
              </Button>
            </div>
          ))}
        </Card>
      )}

      <CreateSessionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        defaultInstructor={user.name}
        onCreated={(s) => {
          toast(`${s.title} created`);
          setSheetOpen(false);
          void sessions.reload(true);
        }}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        loading={cancelBusy}
        danger
        title={`Cancel ${cancelTarget?.title ?? "session"}?`}
        confirmLabel="Cancel session"
        cancelLabel="Keep session"
      >
        <p className="m-0">
          {cancelTarget && `${relativeDay(cancelTarget.startTime)} · ${timeRange(cancelTarget.startTime, cancelTarget.endTime)}. `}
          {cancelTarget && cancelTarget.bookedCount > 0
            ? `All ${cancelTarget.bookedCount} ${cancelTarget.bookedCount === 1 ? "booking" : "bookings"} will be cancelled.`
            : "Nobody has booked it yet."}
        </p>
        {cancelError && (
          <p role="alert" className="m-0 mt-3 font-semibold text-danger-text">
            {cancelError}
          </p>
        )}
      </ConfirmDialog>
    </Stagger>
  );
}

type Errors = Partial<Record<"title" | "instructor" | "slotType" | "startTime" | "endTime" | "maxCapacity", string>>;

function CreateSessionSheet({
  open,
  onClose,
  defaultInstructor,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultInstructor: string;
  onCreated: (s: TrainingSession) => void;
}) {
  const initial = defaultTimes();
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState(defaultInstructor);
  const [slot, setSlot] = useState<SlotType | null>("STANDARD");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [capacity, setCapacity] = useState(MAX_BOOKABLE);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    const t = defaultTimes();
    setTitle("");
    setInstructor(defaultInstructor);
    setSlot("STANDARD");
    setStart(t.start);
    setEnd(t.end);
    setCapacity(MAX_BOOKABLE);
    setErrors({});
    setFormError(null);
  }

  async function save() {
    const e: Errors = {};
    if (!title.trim()) e.title = "Title is required";
    if (!instructor.trim()) e.instructor = "Instructor name is required";
    if (!slot) e.slotType = "Choose a label";
    if (!start) e.startTime = "Start time is required";
    else if (new Date(start) <= new Date()) e.startTime = "Start time must be in the future";
    if (!end) e.endTime = "End time is required";
    else if (start && new Date(end) <= new Date(start)) e.endTime = "End time must be after start time";
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const created = await bookingApi.createSession({
        title: title.trim(),
        instructor: instructor.trim(),
        slotType: slot!,
        startTime: `${start}:00`,
        endTime: `${end}:00`,
        maxCapacity: capacity,
      });
      reset();
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors as Errors);
      else setFormError(errorMessage(err)); // e.g. "Another session already covers this time"
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Create session"
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={save} loading={saving}>
            Create session
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-5"
      >
        <Field label="Title" error={errors.title}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} data-autofocus placeholder="e.g. Evening Session" value={title} onChange={(e) => setTitle(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
          )}
        </Field>
        <Field label="Instructor" error={errors.instructor}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} value={instructor} onChange={(e) => setInstructor(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
          )}
        </Field>
        <ChoiceGroup<SlotType>
          label="Time-of-day label"
          columns={3}
          value={slot}
          onChange={setSlot}
          error={errors.slotType}
          options={(["PEAK", "OFF_PEAK", "STANDARD"] as SlotType[]).map((s) => ({ value: s, label: slotLabel[s] }))}
        />
        <div className="grid grid-cols-1 gap-4">
          <Field label="Start" error={errors.startTime}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="End" error={errors.endTime}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} type="datetime-local" value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span id="cap-label" className="text-[14px] font-semibold text-ink">
            Capacity <span className="font-medium text-muted">(1 to {MAX_BOOKABLE} people)</span>
          </span>
          <div role="group" aria-labelledby="cap-label" className="flex items-center gap-3">
            <IconButton icon="minus" label="Fewer places" size={44} onClick={() => setCapacity((c) => Math.max(1, c - 1))} disabled={capacity <= 1} />
            <output aria-live="polite" className="w-12 text-center text-[24px] font-extrabold tabular-nums">
              {capacity}
            </output>
            <IconButton icon="plus" label="More places" size={44} onClick={() => setCapacity((c) => Math.min(MAX_BOOKABLE, c + 1))} disabled={capacity >= MAX_BOOKABLE} />
          </div>
          <p className="m-0 text-[13px] text-muted">The gym holds 20 people; up to 10 places can be booked, the rest are for walk-ins.</p>
        </div>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
