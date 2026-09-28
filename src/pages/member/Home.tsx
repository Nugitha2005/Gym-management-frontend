import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../../api/client";
import { bookingApi, checkInApi, clearanceApi, loanApi } from "../../api/endpoints";
import type { CheckInRecord } from "../../api/types";
import { useUser } from "../../auth/AuthContext";
import { roleLabel } from "../../auth/roles";
import { DateTile } from "../../components/domain/DateTile";
import { OfferAcceptedBanner, WaitlistOfferBanner } from "../../components/domain/WaitlistOffer";
import { Badge, LiveDot, LoanBadge } from "../../components/ui/Badge";
import { LinkButton } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { LoadError } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { currentClearance, clearanceTone } from "../../lib/domain";
import {
  durationLabel,
  daysUntil,
  firstName,
  fmtDate,
  fmtLongDate,
  fmtTime,
  greeting,
  isSameDay,
  minutesBetween,
  parseLocal,
  relativeDay,
  timeRange,
  whenLabel,
} from "../../lib/format";
import { CountUp, Stagger } from "../../lib/motion";

export default function MemberHome() {
  const user = useUser();
  const now = useNow(30_000);

  // "Not inside" comes back as 404, which is a normal answer here
  const status = useApi<CheckInRecord | null>(
    () => checkInApi.status().catch((err) => (err instanceof ApiError && err.status === 404 ? null : Promise.reject(err))),
    [],
    { refreshMs: 60_000 },
  );
  const clearances = useApi(clearanceApi.mine);
  const bookings = useApi(bookingApi.mine);
  const waitlist = useApi(bookingApi.myWaitlist, [], { refreshMs: 30_000 });
  const loans = useApi(loanApi.mine);
  const [accepted, setAccepted] = useState<{ title: string; when: string } | null>(null);

  const offer = waitlist.data?.find((w) => w.status === "OFFERED" && (parseLocal(w.offerExpiresAt)?.getTime() ?? 0) > now.getTime());

  const nextBooking = useMemo(
    () =>
      (bookings.data ?? [])
        .filter((b) => b.status === "CONFIRMED" && (parseLocal(b.endTime)?.getTime() ?? 0) > now.getTime())
        .sort((a, b) => a.startTime.localeCompare(b.startTime))[0],
    [bookings.data, now],
  );
  const activeLoans = (loans.data ?? []).filter((l) => !l.returnedTime);
  const { state: clearanceState, clearance } = currentClearance(clearances.data);
  const cleared = clearanceState === "APPROVED";

  return (
    <Stagger className="flex flex-col gap-5 lg:gap-6">
      <PageHeader
        greeting
        eyebrow={`${user.roleName === "UNIVERSITY_STAFF" ? "University staff" : "Member"} · Today`}
        title={`${greeting(now)}, ${firstName(user.name)}`}
        description={fmtLongDate(now)}
      />

      {offer && (
        <WaitlistOfferBanner
          entry={offer}
          onDone={(ok) => {
            if (ok) setAccepted({ title: offer.sessionTitle, when: whenLabel(offer.sessionStartTime) });
            void waitlist.reload(true);
            void bookings.reload(true);
          }}
        />
      )}
      {!offer && accepted && <OfferAcceptedBanner title={accepted.title} when={accepted.when} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
        {/* Member ID — the number members give at the front desk */}
        <Card label="Member ID" surface="navy" padding="none" className="relative flex min-h-[196px] flex-col justify-between gap-4 overflow-hidden p-[22px] lg:min-h-[236px] lg:px-7 lg:py-[26px]">
          <svg aria-hidden="true" viewBox="0 0 260 260" fill="none" className="absolute -right-20 -bottom-24 h-60 w-60 stroke-white/7 lg:h-[260px] lg:w-[260px]" strokeWidth={2}>
            <circle cx="130" cy="130" r="128" />
            <circle cx="130" cy="130" r="84" />
            <circle cx="130" cy="130" r="40" />
          </svg>
          <div className="relative flex items-center justify-between">
            <span className="text-label font-bold tracking-eyebrow text-on-navy-muted uppercase">Member ID</span>
            <span className="flex h-[26px] items-center rounded-full bg-white/10 px-2.5 text-[12px] font-semibold">{roleLabel(user.roleName)}</span>
          </div>
          <div className="relative flex flex-col gap-2">
            <span className="text-[34px] leading-none font-extrabold tracking-[0.04em] tabular-nums break-all lg:text-[40px]">{user.universityId}</span>
            <span className="text-[15px] font-semibold">{user.name}</span>
          </div>
          <p className="relative m-0 text-[13px] text-on-navy">Give this number at the front desk.</p>
        </Card>

        <GymStatusCard record={status.data} loading={status.loading && status.data === undefined} error={status.error} onRetry={() => status.reload()} cleared={cleared} now={now} />

        <Card aria-labelledby="clearance-title" className="flex flex-col gap-4">
          <CardHeader icon="shieldPlus" title="Medical clearance" titleId="clearance-title" />
          {clearances.loading && !clearances.data ? (
            <Skeleton className="h-24" />
          ) : clearances.error ? (
            <LoadError error={clearances.error} onRetry={() => clearances.reload()} />
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              {clearanceState === "APPROVED" && clearance?.expiryDate && (
                <>
                  <Badge tone="success" className="self-start">
                    Approved until {fmtDate(clearance.expiryDate)}
                  </Badge>
                  <div className="flex items-baseline gap-2">
                    <CountUp value={Math.max(0, daysUntil(clearance.expiryDate, now))} className="text-[36px] leading-none font-extrabold" />
                    <span className="text-[14px] font-semibold text-muted">days left</span>
                  </div>
                  <p className="m-0 text-[13px] text-muted">You can check in to the gym.</p>
                </>
              )}
              {clearanceState === "PENDING" && clearance && (
                <>
                  <Badge tone="warning" className="self-start">Pending</Badge>
                  <p className="m-0 text-body text-ink">A doctor is reviewing your form.</p>
                  <p className="m-0 text-[13px] text-muted">Submitted {fmtDate(clearance.submittedDate)}</p>
                </>
              )}
              {(clearanceState === "REJECTED" || clearanceState === "REVOKED" || clearanceState === "EXPIRED") && (
                <>
                  <Badge tone={clearanceTone[clearanceState]} className="self-start">
                    {clearanceState === "EXPIRED" ? "Expired" : clearanceState === "REVOKED" ? "Revoked" : "Rejected"}
                  </Badge>
                  <p className="m-0 text-body text-ink">
                    {clearanceState === "EXPIRED"
                      ? `Your clearance ended on ${fmtDate(clearance?.expiryDate)}. Upload a new form to keep using the gym.`
                      : "Your last form was not accepted. Upload a new one to use the gym."}
                  </p>
                  <Link to="/member/medical" className="text-[14px] font-bold">
                    Upload a new form
                  </Link>
                </>
              )}
              {clearanceState === "NONE" && (
                <>
                  <Badge tone="neutral" className="self-start">None</Badge>
                  <p className="m-0 text-body text-ink">Upload a medical form before your first visit.</p>
                  <Link to="/member/medical" className="text-[14px] font-bold">
                    Upload your form
                  </Link>
                </>
              )}
            </div>
          )}
        </Card>

        <Card aria-labelledby="next-booking-title" className="flex flex-col gap-4">
          <CardHeader
            icon="calendar"
            title="Next booking"
            titleId="next-booking-title"
            aside={
              <Link to="/member/bookings" className="text-[14px] font-bold">
                All
              </Link>
            }
          />
          {bookings.loading && !bookings.data ? (
            <Skeleton className="h-16" />
          ) : bookings.error ? (
            <LoadError error={bookings.error} onRetry={() => bookings.reload()} />
          ) : nextBooking ? (
            <div className="flex items-center gap-4">
              <DateTile value={nextBooking.startTime} tone={isSameDay(parseLocal(nextBooking.startTime)!, now) ? "orange" : "light"} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-[18px] font-bold">{nextBooking.sessionTitle}</span>
                <span className="text-[14px] text-muted">{relativeDay(nextBooking.startTime, now)}</span>
                <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold tabular-nums">
                  <Icon name="clock" size={16} className="text-muted" />
                  {timeRange(nextBooking.startTime, nextBooking.endTime)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="m-0 text-body text-muted">No upcoming bookings.</p>
              <LinkButton to="/member/sessions" variant="outline" size="sm" iconRight="arrowRight">
                Browse sessions
              </LinkButton>
            </div>
          )}
        </Card>

        <Card aria-labelledby="loans-title" className="flex flex-col gap-4 md:col-span-2 xl:col-span-2">
          <CardHeader
            icon="ball"
            title="Borrowed items"
            titleId="loans-title"
            aside={
              <span className="rounded-full bg-tile px-2.5 py-1 text-[12px] font-bold text-ocean tabular-nums">
                {activeLoans.length} {activeLoans.length === 1 ? "item" : "items"}
              </span>
            }
          />
          {loans.loading && !loans.data ? (
            <Skeleton className="h-16" />
          ) : loans.error ? (
            <LoadError error={loans.error} onRetry={() => loans.reload()} />
          ) : activeLoans.length === 0 ? (
            <p className="m-0 text-body text-muted">Nothing borrowed right now. Ask at the front desk to borrow equipment.</p>
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 lg:grid-cols-2">
              {activeLoans.map((loan) => {
                const late = loan.status === "LATE" || loan.overdue;
                const due = parseLocal(loan.dueTime);
                return (
                  <li key={loan.loanId} className="flex items-center gap-3 rounded-control bg-ghost-hover p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white text-ocean shadow-card">
                      <Icon name="ball" size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[15px] font-bold">{loan.equipmentName}</p>
                      <p className="m-0 text-[13px] text-muted">Borrowed {fmtTime(loan.receivedTime)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={late ? "text-[14px] font-semibold text-danger-ink tabular-nums" : "text-[14px] font-semibold tabular-nums"}>
                        Due {due && isSameDay(due, now) ? fmtTime(due) : `${relativeDay(due!, now)} ${fmtTime(due)}`}
                      </span>
                      {late && <LoanBadge status="LATE" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </Stagger>
  );
}

function GymStatusCard({
  record,
  loading,
  error,
  onRetry,
  cleared,
  now,
}: {
  record: CheckInRecord | null | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  cleared: boolean;
  now: Date;
}) {
  const since = parseLocal(record?.entryTime);
  const insideMins = since ? minutesBetween(since, now) : 0;
  return (
    <Card aria-labelledby="gym-status-title" className="flex flex-col gap-[18px]">
      <CardHeader icon="door" title="Gym status" titleId="gym-status-title" />
      {loading ? (
        <Skeleton className="h-24" />
      ) : error ? (
        <LoadError error={error} onRetry={onRetry} />
      ) : record ? (
        <div className="flex flex-1 flex-col gap-[18px]">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <LiveDot />
              <span className="text-status font-bold">You are inside since {fmtTime(since)}</span>
            </div>
            <p className="m-0 pl-5 text-[14px] text-muted">
              {insideMins < 1 ? "Checked in just now" : `Inside for ${durationLabel(insideMins)}`}
              {record.sessionTitle && ` · ${record.sessionTitle}`}
            </p>
          </div>
          {/* Checking out = scanning the door code again, which happens on the Check in page */}
          <LinkButton to="/member/check-in" variant="outline" size="lg" block>
            Check out
          </LinkButton>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3.5">
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-idle" />
              <span className="text-status font-bold">You are not in the gym</span>
            </div>
            <p className="m-0 pl-5 text-[14px] leading-snug text-muted">Scan the gym QR code at the door when you arrive.</p>
          </div>
          {!cleared && (
            <p role="alert" className="m-0 flex items-center gap-2 text-[13px] font-semibold text-danger-text">
              <Icon name="alert" size={16} strokeWidth={2} />A valid medical clearance is required.
            </p>
          )}
          <LinkButton to="/member/check-in" size="lg" block pulse={cleared} icon="scan">
            Check in
          </LinkButton>
        </div>
      )}
    </Card>
  );
}
