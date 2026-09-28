import { useMemo, useState } from "react";
import { errorMessage } from "../../api/client";
import { usersApi } from "../../api/endpoints";
import type { RoleName, User } from "../../api/types";
import { useUser } from "../../auth/AuthContext";
import { ALL_ROLES, roleLabel } from "../../auth/roles";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { Input, Select } from "../../components/ui/Field";
import { EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { Rise, Stagger } from "../../lib/motion";

const roleTone: Record<RoleName, BadgeTone> = {
  STUDENT: "neutral",
  UNIVERSITY_STAFF: "info",
  TRAINER: "orange",
  DOCTOR: "success",
  ADMIN: "navy",
};

export default function AdminUsers() {
  const me = useUser();
  const toast = useToast();
  const users = useApi(usersApi.all);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleName | "">("");
  const [change, setChange] = useState<{ user: User; to: RoleName } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(users.data ?? [])]
      .filter((u) => !roleFilter || u.roleName === roleFilter)
      .filter((u) => !q || [u.name, u.universityId, u.email].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users.data, query, roleFilter]);

  async function confirmChange() {
    if (!change) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await usersApi.changeRole(change.user.userId, change.to);
      users.setData((list) => (list ?? []).map((u) => (u.userId === updated.userId ? updated : u)));
      toast(`${updated.name} is now ${roleLabel(updated.roleName)}`);
      setChange(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      width: "1.4fr",
      primary: true,
      render: (u) => (
        <span className="inline-flex items-center gap-2 font-semibold">
          {u.name}
          {u.userId === me.userId && <Badge tone="info" size="sm" dot={false}>You</Badge>}
          {!u.active && <Badge tone="neutral" size="sm" dot={false}>Inactive</Badge>}
        </span>
      ),
    },
    { key: "uid", header: "University ID", width: "0.9fr", render: (u) => u.universityId },
    { key: "email", header: "Email", width: "1.6fr", render: (u) => <span className="break-all">{u.email}</span> },
    { key: "role", header: "Role", width: "1fr", render: (u) => <Badge tone={roleTone[u.roleName]} size="sm">{roleLabel(u.roleName)}</Badge> },
    {
      key: "change",
      header: "Change role",
      width: "210px",
      hideLabelOnMobile: true,
      render: (u) =>
        u.userId === me.userId ? (
          <span className="text-[13px] text-muted">You can’t change your own role.</span>
        ) : (
          <>
            <label htmlFor={`role-${u.userId}`} className="sr-only">
              Change role for {u.name}
            </label>
            <Select
              id={`role-${u.userId}`}
              selectSize="sm"
              value={u.roleName}
              onChange={(e) => {
                setError(null);
                setChange({ user: u, to: e.target.value as RoleName });
              }}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </Select>
          </>
        ),
    },
  ];

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader eyebrow="Admin · People" title="Users" description="Everyone registered in PlayBook. A user’s role decides which screens they see." />

      <Rise className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <Input id="user-search" type="search" placeholder="Search by name, ID or email" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="w-full sm:w-56">
          <label htmlFor="role-filter" className="sr-only">
            Filter by role
          </label>
          <Select id="role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as RoleName | "")}>
            <option value="">All roles</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </Select>
        </div>
        {users.data && <span className="text-[14px] font-semibold text-muted tabular-nums sm:ml-auto">{rows.length} of {users.data.length}</span>}
      </Rise>

      <Card aria-label="All users">
        {users.loading && !users.data ? (
          <Skeleton className="h-64" />
        ) : users.error ? (
          <LoadError error={users.error} onRetry={() => users.reload()} />
        ) : (
          <DataTable label="Users" columns={columns} rows={rows} rowKey={(u) => u.userId} empty={<EmptyState icon="people" title="No users match" />} />
        )}
      </Card>

      <ConfirmDialog
        open={!!change}
        onClose={() => setChange(null)}
        onConfirm={confirmChange}
        loading={busy}
        title={`Change ${change?.user.name ?? ""}’s role?`}
        confirmLabel="Change role"
      >
        {change && (
          <div className="flex flex-col gap-3">
            <p className="m-0 flex flex-wrap items-center gap-2">
              <Badge tone={roleTone[change.user.roleName]} size="sm">{roleLabel(change.user.roleName)}</Badge>
              <Icon name="arrowRight" size={16} />
              <Badge tone={roleTone[change.to]} size="sm">{roleLabel(change.to)}</Badge>
            </p>
            <p className="m-0">They’ll see the {roleLabel(change.to).toLowerCase()} screens the next time they log in.</p>
            {error && (
              <p role="alert" className="m-0 font-semibold text-danger-text">
                {error}
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </Stagger>
  );
}
