import { clearanceApi, incidentApi } from "../../api/endpoints";
import { useUser } from "../../auth/AuthContext";
import { SeverityBadge, IncidentStatusBadge } from "../../components/ui/Badge";
import { LinkButton } from "../../components/ui/Button";
import { TileLink } from "../../components/ui/Card";
import { LoadError } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { firstName, fmtDayMonth, fmtLongDate, greeting } from "../../lib/format";
import { CountUp, Stagger } from "../../lib/motion";

export default function DoctorDashboard() {
  const user = useUser();
  const now = useNow(60_000);
  const pending = useApi(clearanceApi.pending, [], { refreshMs: 60_000 });
  const queue = useApi(incidentApi.queue, [], { refreshMs: 60_000 });

  const forms = [...(pending.data ?? [])].sort((a, b) => a.submittedDate.localeCompare(b.submittedDate));
  const injuries = (queue.data ?? []).filter((i) => i.status !== "CLOSED");
  const urgent = injuries.filter((i) => i.responseOverdue).length;

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader greeting eyebrow="Doctor · Today" title={`${greeting(now)}, ${firstName(user.name)}`} description={fmtLongDate(now)} />

      {!!(pending.error || queue.error) && <LoadError error={pending.error ?? queue.error} onRetry={() => { void pending.reload(); void queue.reload(); }} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <TileLink to="/doctor/clearances" label={`Pending clearances: ${forms.length}`} className="gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-muted">Pending clearances</span>
            <div className="flex items-baseline gap-3">
              {pending.data ? <CountUp value={forms.length} className="text-[48px] leading-none font-extrabold" /> : <Skeleton className="h-12 w-16" />}
              <span className="text-[14px] text-muted">
                {forms.length === 0 ? "nothing waiting" : `${forms.length === 1 ? "form" : "forms"} waiting · oldest since ${fmtDayMonth(forms[0].submittedDate)}`}
              </span>
            </div>
          </div>
          {forms.length > 0 && (
            <ul className="m-0 flex list-none flex-col divide-y divide-divider rounded-control border border-line p-0">
              {forms.slice(0, 3).map((c) => (
                <li key={c.clearanceId} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span className="font-semibold">{c.studentName}</span>
                  <span className="text-muted tabular-nums">{fmtDayMonth(c.submittedDate)}</span>
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-bold text-ocean">Review forms →</span>
        </TileLink>

        <TileLink to="/doctor/injuries" label={`Open injuries: ${injuries.length}`} className="gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-muted">Open injuries</span>
            <div className="flex items-baseline gap-3">
              {queue.data ? <CountUp value={injuries.length} className="text-[48px] leading-none font-extrabold" /> : <Skeleton className="h-12 w-16" />}
              <span className={urgent > 0 ? "text-[14px] font-semibold text-danger-ink" : "text-[14px] text-muted"}>
                {urgent > 0 ? `${urgent} ${urgent === 1 ? "needs" : "need"} a response now` : "none overdue"}
              </span>
            </div>
          </div>
          {injuries.length > 0 && (
            <ul className="m-0 flex list-none flex-col divide-y divide-divider rounded-control border border-line p-0">
              {injuries.slice(0, 3).map((i) => (
                <li key={i.incidentId} className="flex items-center justify-between gap-3 px-4 py-3 text-[14px]">
                  <span className="truncate font-semibold">{i.reportedByName}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={i.severity} />
                    {i.responseOverdue ? <span className="text-[13px] font-bold text-danger-ink">Overdue</span> : <IncidentStatusBadge status={i.status} />}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-bold text-ocean">Open injury queue →</span>
        </TileLink>
      </div>

      {forms.length > 0 && (
        <div>
          <LinkButton to="/doctor/clearances" icon="shieldCheck">
            Start reviewing
          </LinkButton>
        </div>
      )}
    </Stagger>
  );
}
