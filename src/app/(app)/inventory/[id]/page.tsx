import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Edit3, Barcode, MapPin, Package, Tag } from "lucide-react";
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
  InventoryStatusBadge,
  pretty,
} from "@/components/inventory/status-badge";
import { AdjustmentClient } from "@/components/inventory/adjustment-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { snapshotItem, velocity } from "@/server/inventory/calculator";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Inventory item" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);

export default async function InventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      adjustments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          sale: { select: { id: true, customer: { select: { businessName: true } } } },
          createdBy: { select: { fullName: true, email: true } },
        },
      },
    },
  });

  if (!item) notFound();

  const snap = snapshotItem(item);

  // Velocity over last 30d from SALE adjustments
  const since = new Date(Date.now() - 30 * 86400000);
  const recentSales = item.adjustments.filter(
    (a) => a.reason === "SALE" && a.createdAt >= since,
  );
  const salesIn30d = recentSales.reduce(
    (s, a) => s + Math.abs(a.packagesDelta),
    0,
  );
  const v = velocity(item.packagesOnHand, salesIn30d, 30, item.reorderThreshold);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory"
        title={item.productName}
        description={item.sku}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/inventory/${id}/edit`}>
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </PageHeader>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Packages on hand"
              value={item.packagesOnHand.toString()}
              accent={
                snap.computedStatus === "OUT_OF_STOCK"
                  ? "text-red-300"
                  : snap.computedStatus === "LOW_STOCK"
                    ? "text-amber-300"
                    : "text-ivory"
              }
            />
            <StatTile label="Cigar units" value={snap.unitsOnHand.toString()} />
            <StatTile
              label="Value at cost"
              value={fmtUsd(snap.inventoryValueCost)}
            />
            <StatTile
              label="Value at wholesale"
              value={fmtUsd(snap.inventoryValueWholesale)}
              accent="text-ember-200"
            />
          </div>

          {/* Velocity */}
          {v && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sales velocity (30d)</CardTitle>
                <CardDescription>
                  {v.packagesSoldInWindow} packages sold in the last{" "}
                  {v.windowDays} days ({v.packagesPerDay.toFixed(2)}/day).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-3 text-sm">
                <KV
                  label="Days of stock left"
                  value={`${Math.ceil(v.daysOfStockRemaining)} days`}
                  accent={v.daysOfStockRemaining < 14 ? "text-amber-300" : "text-ivory"}
                />
                <KV
                  label="Projected stockout"
                  value={
                    v.projectedStockoutDate
                      ? new Date(v.projectedStockoutDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"
                  }
                />
                <KV
                  label="Reorder?"
                  value={v.recommendReorder ? "Yes — soon" : "Not yet"}
                  accent={v.recommendReorder ? "text-amber-300" : "text-emerald-300"}
                />
              </CardContent>
            </Card>
          )}

          {/* Adjustments + history */}
          <Card>
            <CardHeader>
              <CardTitle>Adjustments & history</CardTitle>
              <CardDescription>
                Every change to stock is logged. Manual adjustments below;
                invoice-linked entries show the customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdjustmentClient
                inventoryItemId={item.id}
                packagingLabel={item.packagingType.toLowerCase().replace("_", "-")}
                adjustments={item.adjustments.map((a) => ({
                  id: a.id,
                  packagesDelta: a.packagesDelta,
                  reason: a.reason,
                  notes: a.notes,
                  createdAt: a.createdAt.toISOString(),
                  createdBy: a.createdBy
                    ? a.createdBy.fullName ?? a.createdBy.email
                    : null,
                  customerName: a.sale?.customer?.businessName ?? null,
                  saleId: a.saleId,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="SKU">
                <code className="font-mono text-ember-200">{item.sku}</code>
              </Row>
              <Row label="Status">
                <InventoryStatusBadge status={snap.computedStatus} />
              </Row>
              <Row label="Blend">
                {item.blend ? (
                  <Badge variant="outline" className="text-[10px]">
                    {item.blend === "CUSTOM" && item.blendCustom
                      ? item.blendCustom
                      : pretty(item.blend)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Row>
              <Row label="Packaging">
                <Badge variant="outline" className="text-[10px]">
                  {pretty(item.packagingType)}
                </Badge>
              </Row>
              <Row label="Units / package">
                <span className="text-ivory tabular-nums">{item.unitsPerPackage}</span>
              </Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Cost / cigar">
                <span className="text-ivory tabular-nums">{fmtUsd(snap.costPerUnit)}</span>
              </Row>
              <Row label="Wholesale / pkg">
                <span className="text-ivory tabular-nums">{fmtUsd(snap.wholesalePrice)}</span>
              </Row>
              {snap.retailPrice > 0 && (
                <Row label="Retail / pkg">
                  <span className="text-ivory tabular-nums">{fmtUsd(snap.retailPrice)}</span>
                </Row>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reorder rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Row label="Threshold">
                <span className="text-ivory tabular-nums">
                  {item.reorderThreshold} pkg
                </span>
              </Row>
              <Row label="Preferred qty">
                <span className="text-ivory tabular-nums">
                  {item.preferredReorderQty} pkg
                </span>
              </Row>
            </CardContent>
          </Card>

          {(item.supplier || item.location || item.barcode) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {item.supplier && (
                  <div className="flex items-center gap-2 text-ivory/90">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.supplier}
                  </div>
                )}
                {item.location && (
                  <div className="flex items-start gap-2 text-ivory/90">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    {item.location}
                  </div>
                )}
                {item.barcode && (
                  <div className="flex items-center gap-2 text-ivory/90">
                    <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                    <code className="font-mono text-[10px]">{item.barcode}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {item.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-ivory/90 whitespace-pre-wrap leading-relaxed">
                  {item.notes}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="text-[10px] text-muted-foreground text-center">
            Added {relativeTime(item.createdAt.toISOString())}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl tabular-nums ${accent ?? "text-ivory"}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base tabular-nums ${accent ?? "text-ivory"}`}>{value}</div>
    </div>
  );
}

void Package;
