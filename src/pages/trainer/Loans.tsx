import { useState } from "react";
import { errorMessage } from "../../api/client";
import { equipmentApi, loanApi } from "../../api/endpoints";
import type { Loan } from "../../api/types";
import { LoanBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { Field, Input, Select } from "../../components/ui/Field";
import { Alert, EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { TabPanel, Tabs } from "../../components/ui/Tabs";
import { useApi } from "../../hooks/useApi";
import { useMemberLookup } from "../../hooks/useMemberLookup";
import { equipmentTypeLabel } from "../../lib/domain";
import { fmtDayMonth, fmtTime, toLocalDate } from "../../lib/format";
import { Stagger } from "../../lib/motion";

type Tab = "active" | "overdue" | "returned";
const when = (v: string | null) => (v ? `${fmtDayMonth(v)} ${fmtTime(v)}` : "—");

function defaultDue() {
  const d = new Date(Date.now() + 2 * 3600 * 1000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return { date: toLocalDate(d), time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
}

export default function Loans() {
  const toast = useToast();
  const loans = useApi(loanApi.all, [], { refreshMs: 60_000 });
  const available = useApi(equipmentApi.available);
  const { lookup, error: memberError, setError: setMemberError, loading: looking } = useMemberLookup();
  const [tab, setTab] = useState<Tab>("active");
  const [itemId, setItemId] = useState("");
  const [memberId, setMemberId] = useState("");
  const initialDue = defaultDue();
  const [dueDate, setDueDate] = useState(initialDue.date);
  const [dueTime, setDueTime] = useState(initialDue.time);
  const [itemError, setItemError] = useState<string | null>(null);
  const [dueError, setDueError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lending, setLending] = useState(false);
  const [returning, setReturning] = useState<number | null>(null);

  async function lend(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setItemError(itemId ? null : "Choose an item");
    const due = new Date(`${dueDate}T${dueTime}`);
    const dueOk = !!dueDate && !!dueTime && due > new Date();
    setDueError(dueOk ? null : "Due time must be in the future.");
    if (!itemId || !dueOk) {
      if (!memberId.trim()) setMemberError("Type the member's University ID.");
      return;
    }
    const member = await lookup(memberId);
    if (!member) return;
    setLending(true);
    try {
      const loan = await loanApi.lend(Number(itemId), member.userId, `${dueDate}T${dueTime}:00`);
      toast(`${loan.equipmentName} lent to ${member.name}`);
      setItemId("");
      setMemberId("");
      const d = defaultDue();
      setDueDate(d.date);
      setDueTime(d.time);
      setTab("active");
      await Promise.all([loans.reload(true), available.reload(true)]);
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLending(false);
    }
  }

  async function markReturned(loan: Loan) {
    setReturning(loan.loanId);
    try {
      await loanApi.markReturned(loan.loanId);
      toast(`${loan.equipmentName} returned`);
      await Promise.all([loans.reload(true), available.reload(true)]);
    } catch (err) {
      toast(errorMessage(err), "danger");
    } finally {
      setReturning(null);
    }
  }

  const all = [...(loans.data ?? [])];
  const active = all.filter((l) => !l.returnedTime).sort((a, b) => a.dueTime.localeCompare(b.dueTime));
  const overdue = active.filter((l) => l.status === "LATE" || l.overdue);
  const returned = all.filter((l) => !!l.returnedTime).sort((a, b) => (b.returnedTime ?? "").localeCompare(a.returnedTime ?? ""));
  const rows = tab === "active" ? active : tab === "overdue" ? overdue : returned;

  const columns: Column<Loan>[] = [
    { key: "item", header: "Item", width: "1.2fr", primary: true, render: (l) => <span className="font-semibold">{l.equipmentName}</span> },
    {
      key: "member",
      header: "Member",
      width: "1.5fr",
      render: (l) => (
        <span className="flex flex-col">
          <span>{l.userName}</span>
          <span className="text-[12px] text-muted">{l.universityId}</span>
        </span>
      ),
    },
    { key: "lent", header: "Lent", width: "1fr", render: (l) => when(l.receivedTime) },
    {
      key: "due",
      header: "Due",
      width: "1fr",
      render: (l) => <span className={!l.returnedTime && (l.status === "LATE" || l.overdue) ? "font-semibold text-danger-ink" : undefined}>{when(l.dueTime)}</span>,
    },
    { key: "status", header: "Status", width: "0.8fr", render: (l) => <LoanBadge status={l.status} overdue={l.overdue} /> },
    {
      key: "returned",
      header: "Returned",
      width: "150px",
      align: "right",
      hideLabelOnMobile: true,
      render: (l) =>
        l.returnedTime ? (
          <span className="text-muted">{when(l.returnedTime)}</span>
        ) : (
          <Button variant="ghost" size="sm" className="w-full md:w-auto" aria-label={`Mark ${l.equipmentName} returned`} loading={returning === l.loanId} onClick={() => markReturned(l)}>
            Mark returned
          </Button>
        ),
    },
  ];

  const items = available.data ?? [];
  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader eyebrow="Front desk · Loans" title="Loans" description="Lend items at the counter and mark them returned." />

      <Card aria-labelledby="lend-title">
        <form noValidate onSubmit={lend} className="flex flex-col gap-5">
          <CardHeader icon="swap" title="Lend an item" titleId="lend-title" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.8fr_0.7fr]">
            <Field label={<>Item <span className="font-medium text-muted">(available only)</span></>} error={itemError}>
              {({ id, describedBy, invalid }) => (
                <Select id={id} value={itemId} onChange={(e) => setItemId(e.target.value)} aria-describedby={describedBy} invalid={invalid} disabled={items.length === 0}>
                  <option value="">{available.loading ? "Loading…" : items.length === 0 ? "Everything is out on loan" : "Choose an item"}</option>
                  {items.map((it) => (
                    <option key={it.equipmentId} value={it.equipmentId}>
                      {it.name} · {equipmentTypeLabel[it.type]}
                      {it.itemCondition !== "Good" ? ` (${it.itemCondition.toLowerCase()})` : ""}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Member ID" error={memberError}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  placeholder="e.g. IT24103257"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value.toUpperCase());
                    setMemberError(null);
                  }}
                  aria-describedby={describedBy}
                  invalid={invalid}
                />
              )}
            </Field>
            <Field label="Due date" error={dueError}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} type="date" min={toLocalDate(new Date())} value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field label="Due time">
              {({ id, describedBy }) => <Input id={id} type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} aria-describedby={describedBy} />}
            </Field>
          </div>
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Button type="submit" size="lg" loading={lending || looking} className="self-start">
            Lend item
          </Button>
        </form>
      </Card>

      <section aria-label="Loans" className="flex flex-col gap-4">
        <Tabs
          idPrefix="loans"
          label="Filter loans"
          value={tab}
          onChange={setTab}
          items={[
            { key: "active", label: "Out now", count: active.length },
            { key: "overdue", label: "Overdue", count: overdue.length },
            { key: "returned", label: "Returned", count: returned.length },
          ]}
        />
        <TabPanel idPrefix="loans" tabKey={tab}>
          <Card>
            {loans.loading && !loans.data ? (
              <Skeleton className="h-40" />
            ) : loans.error ? (
              <LoadError error={loans.error} onRetry={() => loans.reload()} />
            ) : (
              <DataTable
                label={`${tab} loans`}
                columns={columns}
                rows={rows}
                rowKey={(l) => l.loanId}
                rowTone={(l) => (!l.returnedTime && (l.status === "LATE" || l.overdue) ? "danger" : undefined)}
                empty={<EmptyState icon="swap" title="No loans here" />}
              />
            )}
          </Card>
        </TabPanel>
      </section>
    </Stagger>
  );
}
