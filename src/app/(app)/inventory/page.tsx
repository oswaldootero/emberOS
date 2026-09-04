import Link from "next/link";
import {
  Boxes,
  Package,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  pretty,
} from "@/components/inventory/status-badge";
import { InventoryRow } from "@/components/inventory/inventory-row";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { loadInventorySnapshot } from "@/server/inventory";
import { snapshotItem } from "@/server/inventory/calculator";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtInt = (v: number) => Intl.NumberFormat("en-US").format(Math.round(v));

export default async function InventoryPage() {
  await requireUser();

  const [items, snapshot] = await Promise.all([
    prisma.inventoryItem.findMany({
      orderBy: [{ status: "asc" }, { productName: "asc" }],
    }),
    loadInventorySnapshot(),
  ]);

  const rows = items.map(snapshotItem);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory"
        title="What's on the shelf."
        description="Track stock by SKU, blend, and packaging. Orders auto-deduct. Reorders surface here before they're a problem."
      >
        <Button variant="gold" size="sm" asChild>
          <Link href="/inventory/new">
            <Plus className="h-4 w-4" /> Add SKU
          </Link>
        </Button>
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Inventory value (cost)"
          value={fmtUsd(snapshot.totals.valueAtCost)}
          hint={`${fmtUsd(snapshot.totals.valueAtWholesale)} at wholesale`}
          icon={TrendingUp}
        />
        <Kpi
          label="Total packages"
          value={fmtInt(snapshot.totals.totalPackages)}
          hint={`across ${snapshot.totals.distinctSKUs} SKUs`}
          icon={Boxes}
        />
        <Kpi
          label="Total cigar units"
          value={fmtInt(snapshot.totals.totalUnits)}
          icon={Package}
        />
        <Kpi
          label="Sold this month"
          value={`${snapshot.soldThisMonthPackages} pkg`}
          hint={`${fmtUsd(snapshot.soldThisMonthRevenue)} revenue`}
          icon={RefreshCw}
          accent="text-emerald-300"
        />
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusBox label="Active" value={snapshot.status.active} accent="text-emerald-300" />
        <StatusBox label="Low stock" value={snapshot.status.lowStock} accent="text-amber-300" />
        <StatusBox label="Out of stock" value={snapshot.status.outOfStock} accent="text-red-300" />
        <StatusBox label="Discontinued" value={snapshot.status.discontinued} accent="text-muted-foreground" />
      </div>

      {/* Reorder recommendations + alerts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-300" />
              Reorder recommendations
            </CardTitle>
            <CardDescription>
              Based on threshold + 30-day sales velocity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.reorderRecommendations.length === 0 ? (
              <EmptyHint label="Nothing to reorder right now. Stock is healthy." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.reorderRecommendations.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <Link href={`/inventory/${r.id}`} className="text-ivory hover:text-ember-200 truncate block">
                        {r.productName}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">{r.reason}</div>
                    </div>
                    {r.velocity && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        ~{Math.ceil(r.velocity.daysOfStockRemaining)}d left
                      </span>
                    )}
                    <Badge variant="gold" className="text-[10px]">
                      reorder {r.preferredReorderQty || "—"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-ember-300" />
              Best-selling SKUs (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.bestSellingSkus.length === 0 ? (
              <EmptyHint label="No SKU-linked orders yet. Record an order with an SKU selected." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.bestSellingSkus.map((s) => (
                  <li key={s.id} className="py-2 flex items-center gap-3 text-sm">
                    <Link href={`/inventory/${s.id}`} className="flex-1 truncate text-ivory hover:text-ember-200">
                      {s.productName}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">{s.packagesSold} pkg</span>
                    <span className="text-ember-200 tabular-nums">{fmtUsd(s.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales by customer (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.salesByCustomer.length === 0 ? (
              <EmptyHint label="No SKU-linked orders yet." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.salesByCustomer.map((c) => (
                  <li key={c.customerId} className="py-2 flex items-center gap-3 text-sm">
                    <Link href={`/crm/${c.customerId}`} className="flex-1 truncate text-ivory hover:text-ember-200">
                      {c.customerName}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">{c.packages} pkg</span>
                    <span className="text-ember-200 tabular-nums">{fmtUsd(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by channel (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.salesByChannel.length === 0 ? (
              <EmptyHint label="No SKU-linked orders yet." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.salesByChannel.map((c) => (
                  <li key={c.channel} className="py-2 flex items-center gap-3 text-sm">
                    <span className="flex-1 text-ivory">{pretty(c.channel)}</span>
                    <span className="text-[10px] text-muted-foreground">{c.packages} pkg</span>
                    <span className="text-ember-200 tabular-nums">{fmtUsd(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All SKUs table */}
      <Card>
        <CardHeader>
          <CardTitle>All SKUs</CardTitle>
          <CardDescription>{rows.length} total</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8">
              Nothing in inventory yet. Add your first SKU above.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-white/[0.04]">
                {rows.map((r) => (
                  <InventoryRow key={r.id} row={r} />
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                Tip: click any number or status to edit inline.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`h-4 w-4 ${accent ?? "text-ember-300/80"}`} />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <div className="font-display text-3xl md:text-4xl tracking-tight text-ivory tabular-nums">
          {value}
        </div>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3 space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl tabular-nums ${accent ?? "text-ivory"}`}>{value}</div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground italic py-2">{label}</div>;
}
