"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CustomerRow, type CustomerRowProps } from "./customer-row";
import {
  bulkArchiveCustomers,
  bulkDeleteCustomers,
} from "@/server/actions/crm";

/**
 * Selectable customer list with a bulk-action bar. Selection is
 * per-page (matches what's visible); archive is reversible, delete is
 * admin-only and permanent.
 */
export function CustomerListClient({
  rows,
  isAdmin,
}: {
  rows: CustomerRowProps[];
  isAdmin: boolean;
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

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function runBulk(kind: "archive" | "delete") {
    const ids = Array.from(selected);
    const label = kind === "archive" ? "Archive" : "Permanently delete";
    if (
      !confirm(
        `${label} ${ids.length} customer${ids.length === 1 ? "" : "s"}?${
          kind === "delete"
            ? " This also deletes their invoices and orders. This cannot be undone."
            : " They can be restored from the archived view."
        }`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r =
        kind === "archive"
          ? await bulkArchiveCustomers(ids)
          : await bulkDeleteCustomers(ids);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        `${r.id} customer${r.id === "1" ? "" : "s"} ${kind === "archive" ? "archived" : "deleted"}.`,
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      {/* Select-all + bulk bar */}
      <div className="flex items-center gap-3 py-2 border-b border-white/[0.05]">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          aria-label="Select all customers on this page"
          className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
        />
        {selected.size === 0 ? (
          <span className="text-[11px] text-muted-foreground">
            Select customers to archive or delete in bulk
          </span>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-ivory">
              {selected.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => runBulk("archive")}
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Archive className="h-3 w-3" />
              )}
              Archive
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
      </div>

      <ul className="divide-y divide-white/[0.04]">
        {rows.map((r) => (
          <CustomerRow
            key={r.id}
            row={r}
            selected={selected.has(r.id)}
            onSelectChange={(checked) => toggle(r.id, checked)}
            showEdit
          />
        ))}
      </ul>
    </div>
  );
}
