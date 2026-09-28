import { checkInApi, incidentApi, usersApi } from "../../api/endpoints";
import type { IncidentType, RoleName } from "../../api/types";
import { useUser } from "../../auth/AuthContext";
import { ALL_ROLES, roleLabel } from "../../auth/roles";
import { Card, CardHeader } from "../../components/ui/Card";
import { LoadError } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";
import { useApi } from "../../hooks/useApi";
import { useNow } from "../../hooks/useNow";
import { incidentTypeLabel } from "../../lib/domain";
import { firstName, fmtLongDate, greeting } from "../../lib/format";
import { CountUp, Stagger } from "../../lib/motion";

export default function AdminDashboard() {
  const user = useUser();
  const now = useNow(60_000);
  const inside = useApi(checkInApi.inside, [], { refreshMs: 30_000 });
  const queue = useApi(incidentApi.queue, [], { refreshMs: 60_000 });
  const users = useApi(usersApi.all);

  const open = (queue.data ?? []).filter((i) => i.status !== "CLOSED");
  const byType = (Object.keys(incidentTypeLabel) as IncidentType[]).map((t) => [t, open.filter((i) => i.incidentType === t).length] as const);
  const roleCounts = ALL_ROLES.map((r) => [r, (users.data ?? []).filter((u) => u.roleName === r).length] as [RoleName, number]);
  const biggest = Math.max(1, ...roleCounts.map(([, n]) => n));

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader greeting eyebrow="Admin · Whole gym" title={`${greeting(now)}, ${firstName(user.name)}`} description={`${fmtLongDate(now)} · Whole gym overview`} />

      {!!(inside.error || queue.error || users.error) && (
        <LoadError error={inside.error ?? queue.error ?? users.error} onRetry={() => { void inside.reload(); void queue.reload(); void users.reload(); }} />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        <StatCard to="/trainer/inside" label="People inside now" live value={inside.data?.peopleInside} suffix={`/ ${inside.data?.capacityNow ?? 20}`} />
        <StatCard
          to="/trainer/incidents"
          label="Open incidents, all types"
          tone="warning"
          value={queue.data ? open.length : undefined}
          extra={
            <div className="flex flex-wrap gap-1.5">
              {byType.map(([t, n]) => (
                <span key={t} className="rounded-full bg-ghost-hover px-2.5 py-1 text-[12px] font-semibold text-muted tabular-nums">
                  {incidentTypeLabel[t]} {n}
                </span>
              ))}
            </div>
          }
        />
        <StatCard to="/admin/users" label="Registered users" value={users.data?.length} sub="Across five roles" />
      </div>

      <Card aria-labelledby="roles-title" className="flex flex-col gap-5">
        <CardHeader icon="usersCog" title="Users by role" titleId="roles-title" />
        {users.loading && !users.data ? (
          <Skeleton className="h-40" />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {roleCounts.map(([role, n]) => (
              <li key={role} className="grid grid-cols-[120px_1fr_48px] items-center gap-3 sm:grid-cols-[150px_1fr_56px]">
                <span className="text-[14px] font-semibold">{roleLabel(role)}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                  <span className="block h-full rounded-full bg-ocean transition-[width] duration-700 ease-soft" style={{ width: `${(n / biggest) * 100}%` }} />
                </span>
                <CountUp value={n} className="text-right text-[16px] font-extrabold" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Stagger>
  );
}
