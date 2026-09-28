import { useState } from "react";
import { errorMessage } from "../../api/client";
import { bookingApi } from "../../api/endpoints";
import type { Booking } from "../../api/types";
import { DateTile } from "../../components/domain/DateTile";
import { WaitlistOfferBanner } from "../../components/domain/WaitlistOffer";
import { BookingBadge, WaitlistBadge } from "../../components/ui/Badge";
import { Button, LinkButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { TabPanel, Tabs } from "../../components/ui/Tabs";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { hasStarted } from "../../lib/domain";
import { parseLocal, relativeDay, timeRange, whenLabel } from "../../lib/format";
import { Stagger } from "../../lib/motion";

type Tab = "bookings" | "waitlist";

export default function Bookings() {
  const toast = useToast();
  const now = useNow(30_000);
  const bookings = useApi(bookingApi.mine);
  const waitlist = useApi(bookingApi.myWaitlist, [], { refreshMs: 30_000 });
  const [tab, setTab] = useState<Tab>("bookings");
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const allBookings = [...(bookings.data ?? [])];
  const upcoming = allBookings
    .filter((b) => b.status === "CONFIRMED" && (parseLocal(b.endTime)?.getTime() ?? 0) > now.getTime())
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const past = allBookings.filter((b) => !upcoming.includes(b)).sort((a, b) => b.startTime.localeCompare(a.startTime));

  const entries = [...(waitlist.data ?? [])].sort((a, b) => {
    const rank = (s: string) => (s === "OFFERED" ? 0 : s === "WAITING" ? 1 : 2);
    return rank(a.status) - rank(b.status) || b.requestedAt.localeCompare(a.requestedAt);
  });
  const offers = entries.filter((w) => w.status === "OFFERED" && (parseLocal(w.offerExpiresAt)?.getTime() ?? 0) > now.getTime());

  async function confirmCancel() {
    if (!cancelling) return;
    setBusy(true);
    setCancelError(null);
    try {
      await bookingApi.cancel(cancelling.bookingId);
      toast(`Cancelled: ${cancelling.sessionTitle}`);
      setCancelling(null);
      await bookings.reload(true);
    } catch (err) {
      setCancelError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader eyebrow="Member · Bookings" title="My bookings" description="Your session bookings and waitlist places." />

      <Tabs
        idPrefix="bookings"
        label="Bookings and waitlist"
        value={tab}
        onChange={setTab}
        items={[
          { key: "bookings", label: "Bookings", count: upcoming.length },
          { key: "waitlist", label: "Waitlist", count: entries.filter((w) => w.status === "WAITING" || w.status === "OFFERED").length, note: offers.length ? `${offers.length} offer${offers.length > 1 ? "s" : ""}` : undefined },
        ]}
      />

      {tab === "bookings" ? (
        <TabPanel idPrefix="bookings" tabKey="bookings" className="flex flex-col gap-6">
          {bookings.loading && !bookings.data ? (
            <Skeleton className="h-40 rounded-card" />
          ) : bookings.error ? (
            <LoadError error={bookings.error} onRetry={() => bookings.reload()} />
          ) : allBookings.length === 0 ? (
            <Card>
              <EmptyState icon="bookmark" title="No bookings yet" action={<LinkButton to="/member/sessions" variant="outline" size="sm">Browse sessions</LinkButton>}>
                Book a place in a session and it will show up here.
              </EmptyState>
            </Card>
          ) : (
            <>
              <BookingList title="Upcoming" items={upcoming} now={now} onCancel={(b) => { setCancelError(null); setCancelling(b); }} emptyText="No upcoming bookings." />
              {past.length > 0 && <BookingList title="Past and cancelled" items={past} now={now} />}
            </>
          )}
        </TabPanel>
      ) : (
        <TabPanel idPrefix="bookings" tabKey="waitlist" className="flex flex-col gap-4">
          {waitlist.loading && !waitlist.data ? (
            <Skeleton className="h-40 rounded-card" />
          ) : waitlist.error ? (
            <LoadError error={waitlist.error} onRetry={() => waitlist.reload()} />
          ) : entries.length === 0 ? (
            <Card>
              <EmptyState icon="hourglass" title="You're not on any waitlist">
                When a session is full, choose Join waitlist and we'll offer you the next free place.
              </EmptyState>
            </Card>
          ) : (
            <>
              {offers.map((w) => (
                <WaitlistOfferBanner
                  key={w.waitlistId}
                  entry={w}
                  onDone={() => {
                    void waitlist.reload(true);
                    void bookings.reload(true);
                  }}
                />
              ))}
              <Card padding="none" className="divide-y divide-divider">
                {entries
                  .filter((w) => !offers.includes(w))
                  .map((w) => (
                    <div key={w.waitlistId} className="flex items-center gap-4 p-4 sm:px-6">
                      <DateTile value={w.sessionStartTime} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[16px] font-bold">{w.sessionTitle}</p>
                        <p className="m-0 text-[14px] text-muted">{whenLabel(w.sessionStartTime)}</p>
                      </div>
                      <WaitlistBadge status={w.status} />
                    </div>
                  ))}
              </Card>
            </>
          )}
        </TabPanel>
      )}

      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={confirmCancel}
        loading={busy}
        danger
        title={`Cancel ${cancelling?.sessionTitle ?? "booking"}?`}
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
      >
        <p className="m-0">
          {cancelling && `${relativeDay(cancelling.startTime)} · ${timeRange(cancelling.startTime, cancelling.endTime)}. `}
          Your place will be offered to the next person on the waitlist.
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

function BookingList({
  title,
  items,
  now,
  onCancel,
  emptyText,
}: {
  title: string;
  items: Booking[];
  now: Date;
  onCancel?: (b: Booking) => void;
  emptyText?: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="m-0 text-[15px] font-bold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="m-0 text-[14px] text-muted">{emptyText}</p>
      ) : (
        <Card padding="none" className="divide-y divide-divider">
          {items.map((b) => {
            const started = hasStarted(b.startTime, now);
            return (
              <div key={b.bookingId} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:px-6">
                <DateTile value={b.startTime} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[16px] font-bold">{b.sessionTitle}</p>
                  <p className="m-0 text-[14px] text-muted tabular-nums">
                    {relativeDay(b.startTime, now)} · {timeRange(b.startTime, b.endTime)}
                  </p>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                  <BookingBadge status={b.status} />
                  {onCancel && b.status === "CONFIRMED" && !started && (
                    <Button variant="danger" size="sm" onClick={() => onCancel(b)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}
