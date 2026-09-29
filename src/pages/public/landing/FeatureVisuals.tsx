// Small, static versions of real app cards, shown on the landing page.
// They reuse the app's components so the landing page previews exactly what members get.
import { useMemo } from "react";
import { Badge, LiveDot } from "../../../components/ui/Badge";
import { IconTile } from "../../../components/ui/Card";
import { ProgressBar } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";
import { cn } from "../../../lib/cn";

function Frame({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <figure role="img" aria-label={label} className={cn("relative m-0 mx-auto w-full max-w-[460px]", className)}>
      <div aria-hidden="true">{children}</div>
    </figure>
  );
}

function MiniCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-card border border-line bg-white p-5 text-ink shadow-dialog", className)}>{children}</div>;
}

function CardTitle({ icon, children, aside }: { icon: Parameters<typeof IconTile>[0]["icon"]; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={icon} size={36} />
      <span className="flex-1 text-[15px] font-bold">{children}</span>
      {aside}
    </div>
  );
}

/** Deterministic QR-style grid (decorative — not a scannable code). */
function QrPattern({ size = 25 }: { size?: number }) {
  const cells = useMemo(() => {
    let s = 20260927;
    const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const out: Array<[number, number]> = [];
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!inFinder(x, y) && rand() < 0.48) out.push([x, y]);
    return out;
  }, [size]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} rx={1.3} className="fill-none stroke-navy" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.6} className="fill-orange" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" shapeRendering="crispEdges">
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} rx={0.18} className="fill-navy" />
      ))}
      {finder(0, 0)}
      {finder(size - 7, 0)}
      {finder(0, size - 7)}
    </svg>
  );
}

export function QrCheckInVisual() {
  return (
    <Frame label="Preview of the check-in screen: a QR code tile with a pulsing orange ring and a welcome message.">
      <MiniCard className="flex flex-col gap-5 p-6">
        <CardTitle icon="scan" aside={<Badge tone="success" live size="sm">Camera on</Badge>}>
          Scan the gym QR code
        </CardTitle>
        <div className="flex justify-center py-2">
          <div className="animate-pulse-ring rounded-[22px] border-2 border-orange bg-white p-4">
            <div className="h-40 w-40 sm:h-44 sm:w-44">
              <QrPattern />
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-control bg-success-wash p-3.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-success text-white">
            <Icon name="check" size={18} strokeWidth={2.4} />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[15px] font-bold">Welcome, booking for Evening Session</p>
            <p className="m-0 text-[13px] text-muted">Checked in at 17:24 · Code GYM-4F7K2Q9A</p>
          </div>
        </div>
      </MiniCard>
    </Frame>
  );
}

export function MedicalVisual() {
  return (
    <Frame label="Preview of a medical clearance card approved until 12 March 2027 with 168 days left, and the doctor's review queue.">
      <MiniCard className="flex flex-col gap-4 p-6">
        <CardTitle icon="shieldPlus">Medical clearance</CardTitle>
        <Badge tone="success" className="self-start">
          Approved until 12 Mar 2027
        </Badge>
        <div className="flex items-baseline gap-2">
          <span className="text-[40px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">168</span>
          <span className="text-[14px] font-semibold text-muted">days left</span>
        </div>
        <p className="m-0 text-[13px] text-muted">Reviewed by Dr. Anjali Wickramasinghe</p>
      </MiniCard>
      <MiniCard className="relative -mt-6 ml-8 flex flex-col gap-3 sm:ml-16">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold tracking-label text-muted uppercase">Doctor · Clearance reviews</span>
          <Badge tone="warning" size="sm">3 pending</Badge>
        </div>
        {[
          ["Lahiru Silva", "Thu 24 Sep"],
          ["Kavindi Rathnayake", "Fri 25 Sep"],
        ].map(([name, date]) => (
          <div key={name} className="flex items-center justify-between gap-3 border-t border-divider pt-3 text-[14px]">
            <span className="font-semibold">{name}</span>
            <span className="text-muted tabular-nums">{date}</span>
          </div>
        ))}
      </MiniCard>
    </Frame>
  );
}

export function SessionsVisual() {
  return (
    <Frame label="Preview of a session card, Evening Session with 8 of 10 places booked, and a waitlist offer with 4 minutes 32 seconds left to accept.">
      <MiniCard className="flex flex-col gap-3.5 p-6">
        <div className="flex items-center justify-between">
          <Badge tone="orange" size="sm">Peak</Badge>
          <span className="text-[13px] font-semibold text-muted">Today</span>
        </div>
        <p className="m-0 text-[20px] font-bold tracking-[-0.01em]">Evening Session</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted">
          <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} />17:30 – 19:00</span>
          <span className="inline-flex items-center gap-1.5"><Icon name="user" size={16} />Kasun Silva</span>
        </div>
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-semibold tabular-nums">10 of 10 booked</span>
          <Badge tone="danger" size="sm">Full</Badge>
        </div>
        <ProgressBar value={10} max={10} label="Places booked" tone="danger" />
      </MiniCard>
      <div className="relative -mt-5 mr-4 ml-6 flex flex-col gap-3 rounded-card border border-orange-edge bg-orange-wash p-5 text-ink shadow-dialog sm:ml-14">
        <div className="flex items-start gap-3">
          <IconTile icon="hourglass" tone="orange" size={40} />
          <div className="min-w-0">
            <p className="m-0 text-[12px] font-bold tracking-label text-orange-ink uppercase">Waitlist offer</p>
            <p className="m-0 text-[15px] font-bold">A place opened in Evening Session</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[24px] leading-none font-extrabold text-orange-ink tabular-nums">04:32</span>
          <span className="text-[13px] font-semibold text-muted">left</span>
          <div className="flex-1">
            <ProgressBar value={60} max={100} label="Time left" tone="orange" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <span className="flex h-10 items-center justify-center rounded-control bg-ocean text-[14px] font-bold text-white">Accept</span>
          <span className="flex h-10 items-center justify-center rounded-control border border-line-strong bg-white text-[14px] font-semibold">Decline</span>
        </div>
      </div>
    </Frame>
  );
}

export function EquipmentVisual() {
  const items: Array<{ icon: "ball" | "racket" | "puzzle"; name: string; kind: string; due: string; late?: boolean }> = [
    { icon: "ball", name: "Basketball", kind: "Ball · Basketball", due: "16:30", late: true },
    { icon: "racket", name: "Badminton racket", kind: "Racket · Strings good", due: "18:00" },
    { icon: "puzzle", name: "Chess set", kind: "Board game · 32 pieces", due: "19:15" },
  ];
  return (
    <Frame label="Preview of the borrowed items card: a basketball flagged late, a badminton racket and a chess set with due times.">
      <MiniCard className="flex flex-col gap-4 p-6">
        <CardTitle icon="ball" aside={<span className="rounded-full bg-tile px-2.5 py-1 text-[12px] font-bold text-ocean">3 items</span>}>
          Borrowed items
        </CardTitle>
        {items.map((it) => (
          <div key={it.name} className="flex items-center gap-3 rounded-control bg-off-white p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white text-ocean shadow-card">
              <Icon name={it.icon} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[15px] font-bold">{it.name}</p>
              <p className="m-0 truncate text-[13px] text-muted">{it.kind}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-[14px] font-semibold tabular-nums", it.late && "text-danger-ink")}>Due {it.due}</span>
              {it.late && <Badge tone="danger" size="sm" className="font-extrabold">LATE</Badge>}
            </div>
          </div>
        ))}
      </MiniCard>
    </Frame>
  );
}

export function StaffVisual() {
  const roles: Array<[string, number]> = [
    ["Students", 78],
    ["University staff", 34],
    ["Trainers", 12],
    ["Doctors", 6],
    ["Admins", 4],
  ];
  return (
    <Frame label="Preview of staff tools: trainers see 14 of 20 people inside, the doctor sees 3 pending clearances, admins see users by role.">
      <div className="grid grid-cols-2 gap-3">
        <MiniCard className="col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold tracking-label text-muted uppercase">Trainer · People inside now</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-label text-success-ink uppercase">
              <LiveDot className="h-2 w-2" /> Live
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[40px] leading-none font-extrabold tabular-nums">14</span>
            <span className="text-[18px] font-bold text-muted">/ 20</span>
          </div>
          <div className="grid grid-cols-10 gap-1" aria-hidden="true">
            {Array.from({ length: 20 }, (_, i) => (
              <span key={i} className={cn("h-3 rounded-[4px]", i < 14 ? "bg-ocean" : "bg-track")} />
            ))}
          </div>
        </MiniCard>
        <MiniCard className="flex flex-col gap-2 p-4">
          <span className="text-[12px] font-bold tracking-label text-muted uppercase">Doctor</span>
          <span className="text-[32px] leading-none font-extrabold tabular-nums">3</span>
          <span className="text-[13px] text-muted">clearances to review</span>
        </MiniCard>
        <MiniCard className="flex flex-col gap-2 p-4">
          <span className="text-[12px] font-bold tracking-label text-muted uppercase">Admin · Roles</span>
          {roles.map(([label, pct]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-2 rounded-full bg-ocean" style={{ width: `${pct}%` }} />
              <span className="sr-only">{label}</span>
            </div>
          ))}
        </MiniCard>
      </div>
    </Frame>
  );
}
