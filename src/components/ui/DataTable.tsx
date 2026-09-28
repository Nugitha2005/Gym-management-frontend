import { cn } from "../../lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  /** CSS grid track, e.g. "1.5fr" or "150px". */
  width?: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
  /** Hide the label on the phone card layout (e.g. the action column). */
  hideLabelOnMobile?: boolean;
  /** Use as the bold title line on phones. */
  primary?: boolean;
}

interface DataTableProps<T> {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Tint a row, e.g. overstayed members. */
  rowTone?: (row: T) => "danger" | "warning" | undefined;
  empty?: React.ReactNode;
}

/**
 * Data-first table (ARIA table on a CSS grid, as in the mockups).
 * On phones each row becomes a stacked card so nothing scrolls sideways at 390px.
 * Tables get no entrance animation — only the card around them does.
 */
export function DataTable<T>({ label, columns, rows, rowKey, rowTone, empty }: DataTableProps<T>) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");

  if (rows.length === 0) return <>{empty}</>;

  return (
    <div role="table" aria-label={label} className="flex flex-col text-[14px] text-ink">
      <div role="rowgroup" className="hidden md:block">
        <div
          role="row"
          className="grid items-center gap-3.5 rounded-[10px] bg-off-white px-3.5 py-2.5 text-label font-bold tracking-[0.06em] text-muted uppercase"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span key={c.key} role="columnheader" className={cn(c.align === "right" && "text-right")}>
              {c.header}
            </span>
          ))}
        </div>
      </div>
      <div role="rowgroup" className="flex flex-col gap-2 md:gap-0">
        {rows.map((row) => {
          const tone = rowTone?.(row);
          return (
            <div
              key={rowKey(row)}
              role="row"
              className={cn(
                // phones: stacked card
                "flex flex-col gap-2 rounded-control border border-line p-3.5",
                // desktop: grid row
                "md:grid md:min-h-[52px] md:items-center md:gap-3.5 md:rounded-[10px] md:border-0 md:border-b md:border-divider md:px-3.5 md:py-2",
                tone === "danger" && "bg-danger-hover",
                tone === "warning" && "bg-warning-bg/60",
              )}
              style={{ gridTemplateColumns: template }}
            >
              {columns.map((c) => (
                <div
                  key={c.key}
                  role="cell"
                  className={cn(
                    "flex min-w-0 items-center justify-between gap-3 md:block",
                    c.align === "right" && "md:text-right",
                    c.primary && "order-first font-bold md:order-none md:font-normal",
                  )}
                >
                  {!c.hideLabelOnMobile && !c.primary && (
                    <span className="text-label font-bold tracking-[0.06em] text-muted uppercase md:hidden">{c.header}</span>
                  )}
                  <div className={cn("min-w-0 tabular-nums", c.hideLabelOnMobile && "w-full md:w-auto")}>{c.render(row)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
