import type { TrainingSession } from "../../api/types";
import { slotLabel, slotTone } from "../../lib/domain";
import { relativeDay, timeRange } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/Feedback";
import { Icon } from "../ui/Icon";

/** Session card from 08_Sessions: slot label, title, instructor, time, places booked. */
export function SessionCard({ session, footer }: { session: TrainingSession; footer?: React.ReactNode }) {
  const taken = session.bookedCount + session.heldCount;
  const full = session.availablePlaces <= 0;
  const left = session.availablePlaces;
  return (
    <Card as="article" aria-label={`${session.title}, ${relativeDay(session.startTime)} ${timeRange(session.startTime, session.endTime)}`} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Badge tone={slotTone[session.slotType]} size="sm">
          {slotLabel[session.slotType]}
        </Badge>
        <span className="text-[13px] font-semibold text-muted">{relativeDay(session.startTime)}</span>
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 text-[18px] leading-snug font-bold text-ink">{session.title}</h2>
        <div className="flex flex-col gap-1 text-[14px] text-muted">
          <span className="inline-flex items-center gap-2">
            <Icon name="clock" size={16} />
            <span className="tabular-nums">{timeRange(session.startTime, session.endTime)}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Icon name="user" size={16} />
            Instructor on duty: {session.instructor}
          </span>
        </div>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-semibold tabular-nums">
            {taken} of {session.maxCapacity} booked
          </span>
          {full ? (
            <Badge tone="danger" size="sm">Full</Badge>
          ) : (
            <span className="font-semibold text-success-ink tabular-nums">
              {left} {left === 1 ? "place" : "places"} left
            </span>
          )}
        </div>
        <ProgressBar value={taken} max={session.maxCapacity} label="Places booked" tone={full ? "danger" : "ocean"} />
      </div>
      {footer && <div className="pt-1">{footer}</div>}
    </Card>
  );
}
