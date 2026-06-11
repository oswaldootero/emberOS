"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  InlineNumber,
  InlineSelect,
} from "@/components/ui/inline-edit";
import { pretty } from "./status-badge";
import { cn } from "@/lib/utils";
import { updateInventoryItem } from "@/server/actions/inventory";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtInt = (v: number) =>
  Intl.NumberFormat("en-US").format(Math.round(v));

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "destructive" | "outline"
> = {
  ACTIVE: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "destructive",
  DISCONTINUED: "outline",
};

export type InventoryRowProps = {
  id: string;
  sku: string;
  productName: string;
  blend: string | null;
  packagingType: string;
  unitsPerPackage: number;
  packagesOnHand: number;
  unitsOnHand: number;
  inventoryValueWholesale: number;
  reorderThreshold: number;
  status: string;
  computedStatus: "ACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK" | "DISCONTINUED";
};

export function InventoryRow({ row }: { row: InventoryRowProps }) {
  const isLow = row.computedStatus === "LOW_STOCK";
  const isOut = row.computedStatus === "OUT_OF_STOCK";

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3 px-2 -mx-2 rounded transition hover:bg-white/[0.02]",
        (isLow || isOut) && "bg-amber-500/[0.03]",
      )}
    >
      <div className="flex-1 min-w-0">
        <Link
          href={`/inventory/${row.id}`}
          className="flex items-center gap-2 hover:text-ember-200"
        >
          <span className="text-sm text-ivory truncate">{row.productName}</span>
          <code className="text-[10px] text-muted-foreground font-mono">
            {row.sku}
          </code>
          <ExternalLink className="h-2.5 w-2.5 text-muted-foreground opacity-60" />
        </Link>
        <div className="text-[10px] text-muted-foreground">
          {row.blend && <span>{pretty(row.blend)} · </span>}
          {pretty(row.packagingType)} · {row.unitsPerPackage}/pkg
        </div>
      </div>

      {/* On-hand — clickable to edit */}
      <div className="text-right">
        <div className="text-sm text-ivory">
          <InlineNumber
            value={row.packagesOnHand}
            min={0}
            suffix="pkg"
            displayClassName="text-sm text-ivory"
            onSave={async (v) =>
              updateInventoryItem(row.id, { packagesOnHand: v })
            }
          />
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {fmtInt(row.unitsOnHand)} cigars
        </div>
      </div>

      {/* Reorder threshold — clickable */}
      <div className="text-right shrink-0 hidden md:block">
        <div className="text-[10px] text-muted-foreground">threshold</div>
        <div className="text-xs text-ivory">
          <InlineNumber
            value={row.reorderThreshold}
            min={0}
            displayClassName="text-xs"
            onSave={async (v) =>
              updateInventoryItem(row.id, { reorderThreshold: v })
            }
          />
        </div>
      </div>

      {/* Value */}
      <div className="text-right shrink-0">
        <div className="text-sm text-ember-200 tabular-nums">
          {fmtUsd(row.inventoryValueWholesale)}
        </div>
        <div className="text-[10px] text-muted-foreground">at wholesale</div>
      </div>

      {/* Status — clickable dropdown */}
      <InlineSelect
        value={row.status}
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "DISCONTINUED", label: "Discontinued" },
        ]}
        display={
          <Badge variant={STATUS_VARIANT[row.computedStatus] ?? "outline"} className="text-[10px]">
            {pretty(row.computedStatus)}
          </Badge>
        }
        onSave={async (v) => updateInventoryItem(row.id, { status: v as "ACTIVE" })}
      />

      {(isLow || isOut) && (
        <AlertTriangle
          className={cn("h-3.5 w-3.5", isOut ? "text-red-300" : "text-amber-300")}
        />
      )}
    </li>
  );
}
