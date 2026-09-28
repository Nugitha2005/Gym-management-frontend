import { useState } from "react";
import { Link } from "react-router";
import { errorMessage } from "../../api/client";
import { checkInApi } from "../../api/endpoints";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, IconTile } from "../../components/ui/Card";
import { Field, Input } from "../../components/ui/Field";
import { PageHeader } from "../../components/ui/PageHeader";
import { useApi } from "../../hooks/useApi";
import { useMemberLookup } from "../../hooks/useMemberLookup";
import { cn } from "../../lib/cn";
import { durationLabel, fmtTime } from "../../lib/format";
import { CountUp, Stagger } from "../../lib/motion";

interface DeskResult {
  ok: boolean;
  title: string;
  detail: string;
  at: Date;
}

/** 16_Trainer_Check_in_a_member: one button checks a member in, or out if they're already inside. */
export default function DeskCheckIn() {
  const inside = useApi(checkInApi.inside, [], { refreshMs: 30_000 });
  const { lookup, error: lookupError, setError, loading: looking } = useMemberLookup();
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<DeskResult[]>([]);
  const latest = recent[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const member = await lookup(id);
    if (!member) return;
    setBusy(true);
    try {
      const result = await checkInApi.manual(member.userId);
      const entered = result.outcome === "ENTERED";
      const r = result.record;
      push({
        ok: true,
        title: entered ? `${member.name} is checked in` : `${member.name} is checked out`,
        detail: entered
          ? `${member.universityId} · in at ${fmtTime(r?.entryTime)}${r?.sessionTitle ? ` · ${r.sessionTitle}` : ""}`
          : `${member.universityId} · out at ${fmtTime(r?.exitTime)}${r && r.durationMinutes > 0 ? ` after ${durationLabel(r.durationMinutes)}` : ""}`,
        at: new Date(),
      });
      setId("");
      void inside.reload(true);
    } catch (err) {
      push({ ok: false, title: `Couldn’t check in ${member.name}`, detail: errorMessage(err), at: new Date() });
    } finally {
      setBusy(false);
    }
  }

  function push(result: DeskResult) {
    setRecent((list) => [result, ...list].slice(0, 6));
  }

  const count = inside.data?.peopleInside;
  const capacity = inside.data?.capacityNow ?? 20;

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk"
        title="Check in a member"
        description="Type the ID number from the member’s card. The same button checks them in or out."
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-6">
        <Card aria-labelledby="desk-title" className="flex flex-col gap-5">
          <CardHeader icon="idCard" title="Member ID" titleId="desk-title" />
          <form noValidate onSubmit={submit} className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Field label="Member ID number" className="flex-1" error={lookupError}>
              {({ id: inputId, describedBy, invalid }) => (
                <Input
                  id={inputId}
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="e.g. IT24103257"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  aria-describedby={describedBy}
                  invalid={invalid}
                  className="text-[17px] font-semibold tracking-[0.04em] sm:text-[17px]"
                />
              )}
            </Field>
            <Button type="submit" size="lg" pulse={!busy && !looking} loading={busy || looking} className="h-12 sm:mt-[30px]" icon="swap">
              Check in or out
            </Button>
          </form>

          <div aria-live="polite" className="min-h-[92px]">
            {!latest ? (
              <div className="flex h-full items-center gap-3 rounded-control bg-off-white p-4 text-[14px] text-muted">
                <IconTile icon="info" size={40} />
                The result shows here.
              </div>
            ) : (
              <div role={latest.ok ? "status" : "alert"} className={cn("flex items-start gap-3 rounded-control p-4", latest.ok ? "bg-success-wash" : "bg-danger-hover")}>
                <IconTile icon={latest.ok ? "check" : "alert"} tone={latest.ok ? "success" : "danger"} size={44} />
                <div className="min-w-0">
                  <p className={cn("m-0 text-status font-bold", latest.ok ? "text-ink" : "text-danger-ink")}>{latest.title}</p>
                  <p className="m-0 text-[14px] text-muted">{latest.detail}</p>
                </div>
              </div>
            )}
          </div>

          {recent.length > 1 && (
            <div className="flex flex-col gap-2 border-t border-divider pt-4">
              <p className="m-0 text-label font-bold tracking-label text-muted uppercase">Earlier at this desk</p>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
                {recent.slice(1).map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className={cn("truncate", !r.ok && "text-danger-ink")}>{r.title}</span>
                    <span className="shrink-0 text-muted tabular-nums">{fmtTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card aria-label="Gym right now" className="flex flex-col gap-3">
          <span className="text-[14px] font-semibold text-muted">Inside now</span>
          <p className="m-0 flex items-baseline gap-1.5">
            {count === undefined ? <span className="text-[40px] font-extrabold">—</span> : <CountUp value={count} className="text-[40px] leading-none font-extrabold" />}
            <span className="text-[18px] font-bold text-muted">/ {capacity}</span>
          </p>
          <Link to="/trainer/inside" className="text-[14px] font-bold">
            See who’s inside
          </Link>
        </Card>
      </div>
    </Stagger>
  );
}
