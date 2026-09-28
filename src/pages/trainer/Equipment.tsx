import { useMemo, useState } from "react";
import { ApiError, errorMessage } from "../../api/client";
import { equipmentApi } from "../../api/endpoints";
import type { Equipment, EquipmentType } from "../../api/types";
import { Badge } from "../../components/ui/Badge";
import { Button, IconButton } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ChoiceGroup } from "../../components/ui/ChoiceGroup";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { ConfirmDialog, Sheet } from "../../components/ui/Dialog";
import { Field, Input, Select } from "../../components/ui/Field";
import { Alert, EmptyState, LoadError, useToast } from "../../components/ui/Feedback";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { equipmentDetails, equipmentIcon, equipmentTypeLabel } from "../../lib/domain";
import { Rise, Stagger } from "../../lib/motion";

const CONDITIONS = ["Good", "Fair", "Worn", "Damaged"];
const STRINGS = ["Good", "Fair", "Worn", "Broken"];

export default function TrainerEquipment() {
  const toast = useToast();
  const items = useApi(equipmentApi.all);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Equipment | "new" | null>(null);
  const [deleting, setDeleting] = useState<Equipment | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(items.data ?? [])]
      .filter((e) => !q || [e.name, e.sportType, equipmentTypeLabel[e.type], e.itemCondition].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items.data, query]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await equipmentApi.remove(deleting.equipmentId);
      toast(`${deleting.name} deleted`);
      setDeleting(null);
      await items.reload(true);
    } catch (err) {
      // e.g. "This item has loan history and cannot be deleted. Mark it as unavailable instead."
      setDeleteError(errorMessage(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: Column<Equipment>[] = [
    {
      key: "name",
      header: "Item",
      width: "1.4fr",
      primary: true,
      render: (e) => (
        <span className="inline-flex items-center gap-2.5 font-semibold">
          <span className="hidden h-8 w-8 items-center justify-center rounded-[10px] bg-tile text-ocean md:inline-flex">
            <Icon name={equipmentIcon[e.type]} size={17} />
          </span>
          {e.name}
        </span>
      ),
    },
    { key: "type", header: "Type", width: "0.9fr", render: (e) => equipmentTypeLabel[e.type] },
    { key: "condition", header: "Condition", width: "0.8fr", render: (e) => e.itemCondition },
    { key: "details", header: "Details", width: "1.2fr", render: (e) => equipmentDetails(e) || <span className="text-muted">—</span> },
    { key: "status", header: "Status", width: "0.8fr", render: (e) => (e.available ? <Badge tone="success" size="sm">Available</Badge> : <Badge tone="neutral" size="sm">Out</Badge>) },
    {
      key: "actions",
      header: "Actions",
      width: "100px",
      align: "right",
      hideLabelOnMobile: true,
      render: (e) => (
        <div className="flex justify-end gap-2">
          <IconButton icon="edit" label={`Edit ${e.name}`} size={36} onClick={() => setEditing(e)} />
          <IconButton icon="trash" label={`Delete ${e.name}`} variant="danger" size={36} onClick={() => { setDeleteError(null); setDeleting(e); }} />
        </div>
      ),
    },
  ];

  return (
    <Stagger className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk · Equipment"
        title="Equipment"
        description="Everything the gym lends at the counter."
        actions={
          <Button icon="plus" onClick={() => setEditing("new")}>
            Add item
          </Button>
        }
      />

      <Rise className="relative w-full sm:max-w-md">
        <label htmlFor="eq-search" className="sr-only">
          Search equipment
        </label>
        <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <Input id="eq-search" type="search" placeholder="Search by name, sport or type" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </Rise>

      <Card aria-label="Equipment list">
        {items.loading && !items.data ? (
          <Skeleton className="h-48" />
        ) : items.error ? (
          <LoadError error={items.error} onRetry={() => items.reload()} />
        ) : (
          <DataTable
            label="Equipment"
            columns={columns}
            rows={rows}
            rowKey={(e) => e.equipmentId}
            empty={
              <EmptyState icon="ball" title={query ? `No items match “${query}”` : "No equipment yet"}>
                {query ? "Try another name or sport." : "Add the first item with Add item."}
              </EmptyState>
            }
          />
        )}
      </Card>

      <EquipmentSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved, isNew) => {
          toast(isNew ? `${saved.name} added` : `${saved.name} updated`);
          setEditing(null);
          void items.reload(true);
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteBusy}
        danger
        title={`Delete ${deleting?.name ?? "item"}?`}
        confirmLabel="Delete item"
        cancelLabel="Keep item"
      >
        <p className="m-0">It will be removed from the list members see. Items that have been lent before can’t be deleted — set their condition instead.</p>
        {deleteError && (
          <p role="alert" className="m-0 mt-3 font-semibold text-danger-text">
            {deleteError}
          </p>
        )}
      </ConfirmDialog>
    </Stagger>
  );
}

type Errors = Partial<Record<"type" | "name" | "itemCondition" | "sportType" | "stringStatus" | "pieceCount", string>>;

function EquipmentSheet({
  item,
  onClose,
  onSaved,
}: {
  item: Equipment | "new" | null;
  onClose: () => void;
  onSaved: (saved: Equipment, isNew: boolean) => void;
}) {
  const isNew = item === "new";
  const current = item && item !== "new" ? item : null;
  // Re-mount the form for each item so it starts from that item's values
  return (
    <Sheet open={item !== null} onClose={onClose} title={isNew ? "Add item" : `Edit ${current?.name ?? ""}`}>
      {item !== null && <EquipmentForm key={current?.equipmentId ?? "new"} current={current} onCancel={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function EquipmentForm({ current, onCancel, onSaved }: { current: Equipment | null; onCancel: () => void; onSaved: (saved: Equipment, isNew: boolean) => void }) {
  const [type, setType] = useState<EquipmentType | null>(current?.type ?? null);
  const [name, setName] = useState(current?.name ?? "");
  const [condition, setCondition] = useState(current?.itemCondition ?? "Good");
  const [sport, setSport] = useState(current?.sportType ?? "");
  const [strings, setStrings] = useState(current?.stringStatus ?? "Good");
  const [pieces, setPieces] = useState(current?.pieceCount != null ? String(current.pieceCount) : "");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const found: Errors = {};
    if (!type) found.type = "Choose a type";
    if (!name.trim()) found.name = "Name is required";
    if ((type === "BALL" || type === "RACKET") && !sport.trim()) found.sportType = `Sport type is required for a ${type === "BALL" ? "ball" : "racket"}.`;
    if (type === "BOARD_GAME" && !(Number(pieces) > 0)) found.pieceCount = "Piece count must be greater than zero.";
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;

    const body = {
      type: type!,
      name: name.trim(),
      itemCondition: condition,
      sportType: type === "BOARD_GAME" ? null : sport.trim(),
      stringStatus: type === "RACKET" ? strings : null,
      pieceCount: type === "BOARD_GAME" ? Number(pieces) : null,
    };
    setSaving(true);
    try {
      const saved = current ? await equipmentApi.update(current.equipmentId, body) : await equipmentApi.create(body);
      onSaved(saved, !current);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) setErrors(err.fieldErrors as Errors);
      else setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {current ? (
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-semibold text-ink">Type</span>
            <span className="inline-flex items-center gap-2 text-[15px] font-bold">
              <Icon name={equipmentIcon[current.type]} size={18} className="text-ocean" />
              {equipmentTypeLabel[current.type]}
            </span>
            <p className="m-0 text-[13px] text-muted">The type can’t be changed after an item is created.</p>
          </div>
        ) : (
          <ChoiceGroup<EquipmentType>
            label="Type"
            columns={3}
            value={type}
            onChange={setType}
            error={errors.type}
            options={(["BALL", "RACKET", "BOARD_GAME"] as EquipmentType[]).map((t) => ({ value: t, label: equipmentTypeLabel[t] }))}
          />
        )}
      </div>
      <Field label="Name" error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <Input id={id} data-autofocus placeholder={type === "BOARD_GAME" ? "e.g. Chess set" : type === "RACKET" ? "e.g. Badminton racket" : "e.g. Netball"} value={name} onChange={(e) => setName(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <Field label="Condition" error={errors.itemCondition}>
        {({ id, describedBy }) => (
          <Select id={id} value={condition} onChange={(e) => setCondition(e.target.value)} aria-describedby={describedBy}>
            {[...new Set([...CONDITIONS, condition])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {(type === "BALL" || type === "RACKET") && (
        <Field label="Sport type" error={errors.sportType}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} placeholder={type === "RACKET" ? "e.g. Badminton" : "e.g. Basketball"} value={sport} onChange={(e) => setSport(e.target.value)} aria-describedby={describedBy} invalid={invalid} />
          )}
        </Field>
      )}
      {type === "RACKET" && (
        <Field label="String condition" error={errors.stringStatus}>
          {({ id, describedBy }) => (
            <Select id={id} value={strings} onChange={(e) => setStrings(e.target.value)} aria-describedby={describedBy}>
              {[...new Set([...STRINGS, strings])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      {type === "BOARD_GAME" && (
        <Field label="Piece count" error={errors.pieceCount}>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="number" min={1} inputMode="numeric" placeholder="e.g. 32" value={pieces} onChange={(e) => setPieces(e.target.value)} aria-describedby={describedBy} invalid={invalid} className="sm:max-w-[200px]" />
          )}
        </Field>
      )}
      {formError && <Alert tone="danger">{formError}</Alert>}
      <div className="mt-2 flex flex-col-reverse gap-2.5 border-t border-divider pt-5 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" loading={saving}>
          {current ? "Save changes" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
