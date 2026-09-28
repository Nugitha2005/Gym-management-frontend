import { useMemo, useState } from "react";
import { equipmentApi, loanApi } from "../../api/endpoints";
import type { Equipment as EquipmentItem, Loan } from "../../api/types";
import { Badge, LoanBadge } from "../../components/ui/Badge";
import { Card, CardHeader } from "../../components/ui/Card";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { Input } from "../../components/ui/Field";
import { EmptyState, LoadError } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { equipmentDetails, equipmentIcon, equipmentTypeLabel } from "../../lib/domain";
import { fmtDayMonth, fmtTime } from "../../lib/format";
import { Rise, Stagger } from "../../lib/motion";

const when = (v: string | null) => (v ? `${fmtDayMonth(v)} ${fmtTime(v)}` : "—");

export default function Equipment() {
  const items = useApi(equipmentApi.all);
  const loans = useApi(loanApi.mine);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...(items.data ?? [])].sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter((e) =>
      [e.name, e.sportType, equipmentTypeLabel[e.type], e.itemCondition].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [items.data, query]);

  const available = (items.data ?? []).filter((e) => e.available).length;
  const myLoans = [...(loans.data ?? [])].sort((a, b) => b.receivedTime.localeCompare(a.receivedTime));

  const loanColumns: Column<Loan>[] = [
    { key: "item", header: "Item", width: "1.4fr", primary: true, render: (l) => l.equipmentName },
    { key: "received", header: "Received", width: "1fr", render: (l) => when(l.receivedTime) },
    {
      key: "due",
      header: "Due",
      width: "1fr",
      render: (l) => <span className={l.status === "LATE" || l.overdue ? "font-semibold text-danger-ink" : undefined}>{when(l.dueTime)}</span>,
    },
    { key: "returned", header: "Returned", width: "1fr", render: (l) => when(l.returnedTime) },
    { key: "status", header: "Status", width: "0.8fr", render: (l) => <LoanBadge status={l.status} overdue={l.overdue} /> },
  ];

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Member · Equipment"
        title="Equipment"
        description="See what the gym lends. Items are borrowed and returned at the front desk."
      />

      <Rise className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <label htmlFor="equip-search" className="sr-only">
            Search equipment
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <Input id="equip-search" type="search" placeholder="Search by name, sport or type" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        {items.data && (
          <p className="m-0 text-[14px] font-semibold text-muted tabular-nums" aria-live="polite">
            {query ? `${filtered.length} of ${items.data.length} items` : `${available} of ${items.data.length} available now`}
          </p>
        )}
      </Rise>

      {items.loading && !items.data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-card" />
          ))}
        </div>
      ) : items.error ? (
        <LoadError error={items.error} onRetry={() => items.reload()} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState icon="search" title={query ? `No items match “${query}”` : "No equipment yet"}>
            {query ? "Try a sport, like tennis, or a type, like board game." : "The front desk hasn't added any equipment."}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((e) => (
            <EquipmentCard key={e.equipmentId} item={e} />
          ))}
        </div>
      )}

      <Card aria-labelledby="my-loans-title" className="flex flex-col gap-4">
        <CardHeader icon="swap" title="My loans" titleId="my-loans-title" />
        {loans.loading && !loans.data ? (
          <Skeleton className="h-24" />
        ) : loans.error ? (
          <LoadError error={loans.error} onRetry={() => loans.reload()} />
        ) : (
          <DataTable
            label="My loans"
            columns={loanColumns}
            rows={myLoans}
            rowKey={(l) => l.loanId}
            rowTone={(l) => (l.status === "LATE" || l.overdue ? "danger" : undefined)}
            empty={<p className="m-0 text-[14px] text-muted">You haven't borrowed anything yet.</p>}
          />
        )}
      </Card>
    </Stagger>
  );
}

function EquipmentCard({ item }: { item: EquipmentItem }) {
  return (
    <Card as="article" aria-label={item.name} className="flex flex-col gap-3.5" padding="sm">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-control bg-tile text-ocean">
          <Icon name={equipmentIcon[item.type]} size={20} />
        </span>
        {item.available ? <Badge tone="success" size="sm">Available</Badge> : <Badge tone="neutral" size="sm">Out</Badge>}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-label font-bold tracking-label text-muted uppercase">{equipmentTypeLabel[item.type]}</span>
        <h2 className="m-0 text-[17px] font-bold text-ink">{item.name}</h2>
        {equipmentDetails(item) && <p className="m-0 text-[14px] text-muted">{equipmentDetails(item)}</p>}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-divider pt-3 text-[13px]">
        <span className="text-muted">Condition</span>
        <span className="font-semibold text-ink">{item.itemCondition}</span>
      </div>
    </Card>
  );
}
