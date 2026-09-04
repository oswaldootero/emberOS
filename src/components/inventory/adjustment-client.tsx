"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdjustmentForm } from "./adjustment-form";
import { pretty } from "./status-badge";
import { relativeTime } from "@/lib/utils";

export type AdjustmentRow = {
  id: string;
  packagesDelta: number;
  reason: string;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  customerName: string | null;
  saleId: string | null;
};

const REASON_COLOR: Record<string, string> = {
  SALE: "text-emerald-300",
  PURCHASE: "text-ember-200",
  RETURN: "text-ember-200",
  CORRECTION: "text-muted-foreground",
  SAMPLE: "text-amber-300",
  EVENT: "text-amber-300",
  DAMAGE: "text-red-300",
  TRANSFER: "text-muted-foreground",
};

export function AdjustmentClient({
  inventoryItemId,
  packagingLabel,
  adjustments,
}: {
  inventoryItemId: string;
  packagingLabel: string;
  adjustments: AdjustmentRow[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {adjustments.length === 0
            ? "No adjustments yet."
            : `${adjustments.length} most-recent entries.`}
        </p>
        <Button
          variant={showForm ? "ghost" : "gold"}
          size="sm"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "Cancel" : "New adjustment"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <AdjustmentForm
              inventoryItemId={inventoryItemId}
              packagingLabel={packagingLabel}
              onClose={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {adjustments.length > 0 && (
        <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 divide-y divide-white/[0.04]">
          {adjustments.map((a) => {
            const up = a.packagesDelta > 0;
            return (
              <div key={a.id} className="p-3 flex items-center gap-3 text-sm">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center ${up ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  {up ? (
                    <Plus className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-red-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm tabular-nums ${up ? "text-emerald-300" : "text-red-300"}`}>
                      {up ? "+" : ""}{a.packagesDelta} {packagingLabel}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${REASON_COLOR[a.reason] ?? ""}`}>
                      {pretty(a.reason)}
                    </Badge>
                    {a.customerName && (
                      <span className="text-[10px] text-muted-foreground">{a.customerName}</span>
                    )}
                  </div>
                  {a.notes && (
                    <div className="text-[10px] text-muted-foreground truncate">{a.notes}</div>
                  )}
                </div>
                {a.saleId && (
                  <Link
                    href={`/sales/${a.saleId}`}
                    className="text-[10px] text-ember-300 inline-flex items-center gap-1 hover:underline"
                    title="Linked invoice"
                  >
                    <LinkIcon className="h-3 w-3" /> Invoice
                  </Link>
                )}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {relativeTime(a.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
