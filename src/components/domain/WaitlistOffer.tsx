import { motion } from "framer-motion";
import { useState } from "react";
import { bookingApi } from "../../api/endpoints";
import { errorMessage } from "../../api/client";
import type { WaitlistEntry } from "../../api/types";
import { useNow } from "../../hooks/useNow";
import { countdown, fmtTime, parseLocal, relativeDay } from "../../lib/format";
import { riseVariants } from "../../lib/motion";
import { Button } from "../ui/Button";
import { IconTile } from "../ui/Card";
import { ProgressBar, useToast } from "../ui/Feedback";

// Offers last at most 15 minutes (OfferFreedPlaceCommand), so that is the bar's full width.
const OFFER_WINDOW_MS = 15 * 60 * 1000;

/**
 * Orange "Waitlist offer" banner with a live countdown (04_Member_home / 09_My_bookings).
 * Accept = secondary (ocean), Decline = ghost — the screen's orange action stays Check in.
 */
export function WaitlistOfferBanner({ entry, onDone }: { entry: WaitlistEntry; onDone: (accepted: boolean) => void }) {
  const now = useNow(1000);
  const toast = useToast();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expires = parseLocal(entry.offerExpiresAt);
  const msLeft = expires ? expires.getTime() - now.getTime() : 0;
  const expired = msLeft <= 0;
  const start = parseLocal(entry.sessionStartTime);

  async function respond(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    setError(null);
    try {
      const result = accept ? await bookingApi.acceptOffer(entry.waitlistId) : await bookingApi.declineOffer(entry.waitlistId);
      if (accept && result.outcome !== "CONVERTED") {
        setError(result.message);
      } else {
        toast(accept ? `You are booked into ${entry.sessionTitle}` : "Offer declined");
        onDone(accept);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <motion.section
      variants={riseVariants}
      aria-label="Waitlist offer"
      className="flex flex-col gap-4 rounded-card border border-orange-edge bg-orange-wash p-[18px] shadow-card md:flex-row md:items-center md:gap-6 md:px-6 md:py-5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5 md:items-center">
        <IconTile icon="hourglass" tone="orange" size={48} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 text-label font-bold tracking-label text-orange-ink uppercase">Waitlist offer</p>
          <p className="m-0 text-[16px] leading-snug font-bold text-ink md:text-[17px]">
            A place opened in {entry.sessionTitle}.{" "}
            {expires && !expired && <>Accept before {fmtTime(expires)}</>}
            {expired && "This offer has expired."}
          </p>
          {start && (
            <p className="m-0 text-[14px] text-muted">
              {relativeDay(start)} · {fmtTime(start)}
            </p>
          )}
          {error && (
            <p role="alert" className="m-0 text-[13px] font-semibold text-danger-text">
              {error}
            </p>
          )}
        </div>
      </div>
      {!expired && (
        <div className="flex items-center gap-3 md:w-[150px] md:flex-col md:items-end md:gap-2">
          <div role="timer" aria-label="Time left to accept" className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-[24px] leading-none font-extrabold text-orange-ink tabular-nums md:text-[28px]">{countdown(msLeft)}</span>
            <span className="text-[13px] font-semibold text-muted">left</span>
          </div>
          <ProgressBar value={msLeft} max={OFFER_WINDOW_MS} label="Time left to accept" tone="orange" className="flex-1 md:w-[150px] md:flex-none" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 md:flex md:shrink-0">
        <Button variant="secondary" onClick={() => respond(true)} loading={busy === "accept"} disabled={expired || !!busy}>
          Accept
        </Button>
        <Button variant="ghost" onClick={() => respond(false)} loading={busy === "decline"} disabled={expired || !!busy}>
          Decline
        </Button>
      </div>
    </motion.section>
  );
}

/** Green confirmation shown after accepting an offer. */
export function OfferAcceptedBanner({ title, when }: { title: string; when: string }) {
  return (
    <motion.section
      variants={riseVariants}
      initial="hidden"
      animate="show"
      aria-label="Waitlist offer accepted"
      className="flex items-start gap-3.5 rounded-card border border-success-edge bg-success-wash p-[18px] md:items-center md:px-6 md:py-5"
    >
      <IconTile icon="check" tone="success" size={48} />
      <div className="flex flex-col gap-1">
        <p className="m-0 text-label font-bold tracking-label text-success-ink uppercase">Offer accepted</p>
        <p className="m-0 text-[16px] font-bold text-ink md:text-[17px]">You are booked into {title}</p>
        <p className="m-0 text-[14px] text-muted">{when}</p>
      </div>
    </motion.section>
  );
}
