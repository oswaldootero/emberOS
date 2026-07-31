import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Mic, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SellSheetEditor, type SheetRow } from "@/components/events/sell-sheet-editor";
import { EventLiveClient } from "@/components/events/event-live-client";
import { DeleteEventButton, ReopenEventButton } from "@/components/events/event-actions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { getEventSnapshot } from "@/server/actions/events";
import { n } from "@/server/sales";
import { cn } from "@/lib/utils";

export const metadata = { title: "Event" };
export const dynamic = "force-dynamic";
// Voice sales call Whisper + a parse model
export const maxDuration = 60;

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: v % 1 === 0 ? 0 : 2,
  }).format(v);

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const ev = await prisma.sellingEvent.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { sales: true } } },
      },
      sales: {
        orderBy: { soldAt: "asc" },
        include: {
          item: { select: { label: true } },
          soldBy: { select: { fullName: true, email: true } },
        },
      },
    },
  });
  if (!ev) notFound();

  const header = (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/events">
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>
      </Button>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl text-ivory">{ev.name}</h1>
            {ev.status === "LIVE" ? (
              <Badge variant="gold" className="gap-1 text-[10px]">
                <Radio className="h-2.5 w-2.5 animate-pulse" /> LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                {ev.status.toLowerCase()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {ev.startsAt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </span>
            {ev.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {ev.venue}
              </span>
            )}
          </div>
          {ev.notes && <p className="text-xs text-ivory/70 mt-2 whitespace-pre-wrap">{ev.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          {ev.status === "CLOSED" && <ReopenEventButton eventId={ev.id} />}
          {ev.sales.length === 0 && <DeleteEventButton eventId={ev.id} />}
        </div>
      </div>
    </div>
  );

  // ── UPCOMING: sell-sheet setup ──
  if (ev.status === "UPCOMING") {
    const inventoryOptions = await prisma.inventoryItem.findMany({
      where: { status: "ACTIVE" },
      orderBy: { productName: "asc" },
      select: { id: true, productName: true, packagingType: true, retailPrice: true },
    });
    const rows: SheetRow[] = ev.items.map((i) => ({
      id: i.id,
      label: i.label,
      unitPrice: n(i.unitPrice),
      qtyBrought: i.qtyBrought,
      inventoryItemId: i.inventoryItemId,
      salesCount: i._count.sales,
    }));
    return (
      <div className="space-y-6">
        {header}
        <SellSheetEditor
          eventId={ev.id}
          rows={rows}
          inventoryOptions={inventoryOptions.map((o) => ({
            id: o.id,
            productName: o.productName,
            packagingType: o.packagingType,
            retailPrice: n(o.retailPrice),
          }))}
          canGoLive={ev.items.length > 0}
        />
      </div>
    );
  }

  // ── LIVE: the selling screen ──
  if (ev.status === "LIVE") {
    const snap = await getEventSnapshot(ev.id);
    if (!snap.ok) notFound();
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Mic className="h-3 w-3 text-ember-300" />
          Tap a tile to sell one — or hold the mic and say it: "just sold a 3-pack".
        </div>
        <EventLiveClient
          eventId={ev.id}
          initial={snap.snapshot}
          hasInventoryLinks={ev.items.some((i) => i.inventoryItemId)}
        />
      </div>
    );
  }

  // ── CLOSED: report ──
  const soldByItem = new Map<string, { sold: number; revenue: number }>();
  const bySeller = new Map<string, { units: number; revenue: number }>();
  let totalUnits = 0;
  let totalRevenue = 0;
  for (const s of ev.sales) {
    const rev = s.qty * n(s.unitPrice);
    const acc = soldByItem.get(s.itemId) ?? { sold: 0, revenue: 0 };
    acc.sold += s.qty;
    acc.revenue += rev;
    soldByItem.set(s.itemId, acc);
    const seller = s.soldBy?.fullName ?? s.soldBy?.email ?? "Unknown";
    const sacc = bySeller.get(seller) ?? { units: 0, revenue: 0 };
    sacc.units += s.qty;
    sacc.revenue += rev;
    bySeller.set(seller, sacc);
    totalUnits += s.qty;
    totalRevenue += rev;
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Revenue" value={fmtUsd(totalRevenue)} accent />
        <Stat label="Units sold" value={String(totalUnits)} />
        <Stat label="Sales recorded" value={String(ev.sales.length)} />
        <Stat
          label="Closed"
          value={
            ev.closedAt
              ? ev.closedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"
          }
        />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sell-through</CardTitle>
            <CardDescription>
              What you brought vs. what went home with someone.
              {ev.inventoryDeductedAt && " Inventory was deducted at close."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
                    <th className="text-left font-normal py-2 px-2">Item</th>
                    <th className="text-right font-normal py-2 px-2">Brought</th>
                    <th className="text-right font-normal py-2 px-2">Sold</th>
                    <th className="text-right font-normal py-2 px-2">Left</th>
                    <th className="text-right font-normal py-2 px-2">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {ev.items.map((i) => {
                    const s = soldByItem.get(i.id) ?? { sold: 0, revenue: 0 };
                    const soldOut = i.qtyBrought > 0 && s.sold >= i.qtyBrought;
                    return (
                      <tr key={i.id}>
                        <td className="py-2 px-2 text-ivory">
                          {i.label}
                          <span className="text-muted-foreground text-xs"> · {fmtUsd(n(i.unitPrice))}</span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                          {i.qtyBrought || "—"}
                        </td>
                        <td className={cn("py-2 px-2 text-right tabular-nums", soldOut ? "text-emerald-300" : "text-ivory")}>
                          {s.sold}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                          {i.qtyBrought > 0 ? Math.max(0, i.qtyBrought - s.sold) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums text-ember-200">
                          {fmtUsd(s.revenue)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By seller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from(bySeller.entries())
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([seller, v]) => (
                  <div key={seller} className="flex items-center justify-between text-sm">
                    <span className="text-ivory truncate">{seller}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {v.units} units · <span className="text-ember-200">{fmtUsd(v.revenue)}</span>
                    </span>
                  </div>
                ))}
              {bySeller.size === 0 && (
                <p className="text-sm text-muted-foreground italic">No sales recorded.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sale log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-80 overflow-y-auto">
              {ev.sales.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {s.soldAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </span>
                  <span className="text-ivory truncate">
                    {s.qty > 1 && `${s.qty} × `}
                    {s.item.label}
                  </span>
                  {s.source === "VOICE" && <Mic className="h-2.5 w-2.5 text-ember-300 shrink-0" />}
                  <span className="ml-auto text-ember-200 tabular-nums shrink-0">
                    {fmtUsd(s.qty * n(s.unitPrice))}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={cn(accent && "border-ember-500/30 bg-ember-500/[0.05]")}>
      <CardContent className="p-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("font-display text-2xl tabular-nums", accent ? "text-ember-200" : "text-ivory")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
