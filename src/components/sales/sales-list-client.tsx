"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SaleStatusBadge } from "./status-badge";
import { SortableHeader } from "@/components/ui/data-table";
import { bulkDeleteSales, bulkVoidSales } from "@/server/actions/sales";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

export type SaleListRow = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string | null;
  status: string;
  grandTotal: number;
  amountPaid: number;
};

export function SalesListClient({
  rows,
  isAdmin,
  sort,
  dir,
  baseQuery,
}: {
  rows: SaleListRow[];
  isAdmin: boolean;
  sort: string;
  dir: "asc" | "desc";
  baseQuery: Record<string, string | number | undefined>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function runBulk(kind: "void" | "delete") {
    const ids = Array.from(selected);
    if (
      !confirm(
        kind === "void"
          ? `Void ${ids.length} invoice${ids.length === 1 ? "" : "s"}? They stay on record but stop counting toward revenue.`
          : `Permanently delete ${ids.length} invoice${ids.length === 1 ? "" : "s"} and their line items? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r =
        kind === "void" ? await bulkVoidSales(ids) : await bulkDeleteSales(ids);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `${r.id} invoice${r.id === "1" ? "" : "s"} ${kind === "void" ? "voided" : "deleted"}.`,
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div>
      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap py-2 mb-1 border-b border-white/[0.05]">
          <span className="text-[11px] text-ivory">{selected.size} selected</span>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => runBulk("void")}
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Ban className="h-3 w-3" />
            )}
            Void
          </Button>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => runBulk("delete")}
              className="text-red-300 hover:text-red-200 border-red-500/30"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            className="text-muted-foreground"
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
              <th className="py-2 px-2 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(
                      allSelected ? new Set() : new Set(rows.map((r) => r.id)),
                    )
                  }
                  aria-label="Select all invoices on this page"
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
                />
              </th>
              <th className="text-left font-normal py-2 px-2">
                <SortableHeader
                  label="Invoice"
                  field="invoiceNumber"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/sales"
                  baseQuery={baseQuery}
                />
              </th>
              <th className="text-left font-normal py-2 px-2">Customer</th>
              <th className="text-left font-normal py-2 px-2">
                <SortableHeader
                  label="Date"
                  field="invoiceDate"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/sales"
                  baseQuery={baseQuery}
                />
              </th>
              <th className="text-left font-normal py-2 px-2 hidden md:table-cell">
                <SortableHeader
                  label="Due"
                  field="dueDate"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/sales"
                  baseQuery={baseQuery}
                />
              </th>
              <th className="text-left font-normal py-2 px-2">Status</th>
              <th className="text-right font-normal py-2 px-2">
                <SortableHeader
                  label="Total"
                  field="grandTotal"
                  currentSort={sort}
                  currentDir={dir}
                  basePath="/sales"
                  baseQuery={baseQuery}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition">
                <td className="py-2.5 px-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={(e) => toggle(s.id, e.target.checked)}
                    aria-label={`Select ${s.invoiceNumber}`}
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <Link
                    href={`/sales/${s.id}`}
                    className="font-mono text-xs text-ember-200 hover:underline"
                  >
                    {s.invoiceNumber}
                  </Link>
                </td>
                <td className="py-2.5 px-2">
                  <Link
                    href={`/crm/${s.customerId}`}
                    className="text-ivory hover:text-ember-200 truncate block max-w-[220px]"
                  >
                    {s.customerName}
                  </Link>
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground">
                  {fmtDate(s.invoiceDate)}
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">
                  {fmtDate(s.dueDate)}
                </td>
                <td className="py-2.5 px-2">
                  <SaleStatusBadge status={s.status} />
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-ivory">
                  {fmtUsd(s.grandTotal)}
                  {s.status === "PARTIAL" && (
                    <div className="text-[10px] text-amber-300">
                      {fmtUsd(s.amountPaid)} paid
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
