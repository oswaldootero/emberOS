import Link from "next/link";
import { CalendarDays, MapPin, Plus, Radio, Store } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { n } from "@/server/sales";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sales Events" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function EventsPage() {
  await requireUser();

  const events = await prisma.sellingEvent.findMany({
    orderBy: [{ status: "asc" }, { startsAt: "desc" }],
    include: {
      _count: { select: { items: true } },
      sales: { select: { qty: true, unitPrice: true } },
    },
    take: 100,
  });

  const withTotals = events.map((ev) => ({
    ...ev,
    units: ev.sales.reduce((s, x) => s + x.qty, 0),
    revenue: ev.sales.reduce((s, x) => s + x.qty * n(x.unitPrice), 0),
  }));

  const live = withTotals.filter((e) => e.status === "LIVE");
  const upcoming = withTotals.filter((e) => e.status === "UPCOMING");
  const closed = withTotals.filter((e) => e.status === "CLOSED");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Business"
        title="Sales events"
        description="Set up the sell sheet before the event — then tap or talk to tally every sale."
      >
        <Button variant="gold" size="sm" asChild>
          <Link href="/events/new">
            <Plus className="h-4 w-4" /> New event
          </Link>
        </Button>
      </PageHeader>

      {withTotals.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center space-y-3">
            <Store className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No events yet. Create one, add what you're bringing, and your
              phones become the register.
            </p>
            <Button variant="gold" size="sm" asChild>
              <Link href="/events/new"><Plus className="h-3.5 w-3.5" /> New event</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {live.length > 0 && <Section title="Live now" events={live} />}
          {upcoming.length > 0 && <Section title="Upcoming" events={upcoming} />}
          {closed.length > 0 && <Section title="Past events" events={closed} />}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  events,
}: {
  title: string;
  events: {
    id: string;
    name: string;
    venue: string | null;
    startsAt: Date;
    status: string;
    sealedAt: Date | null;
    units: number;
    revenue: number;
    _count: { items: number };
  }[];
}) {
  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((ev) => (
          <Link key={ev.id} href={`/events/${ev.id}`}>
            <Card
              className={cn(
                "h-full transition hover:border-ember-500/30",
                ev.status === "LIVE" && "border-ember-500/40 bg-ember-500/[0.04]",
              )}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-lg text-ivory leading-tight">
                    {ev.name}
                  </div>
                  {ev.status === "LIVE" ? (
                    <Badge variant="gold" className="text-[9px] shrink-0 gap-1">
                      <Radio className="h-2.5 w-2.5 animate-pulse" /> LIVE
                    </Badge>
                  ) : ev.sealedAt ? (
                    <Badge variant="success" className="text-[9px] shrink-0">sealed</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {ev.status === "CLOSED" ? "closed" : "upcoming"}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" />
                    {ev.startsAt.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  {ev.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" /> {ev.venue}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-xs">
                  <span className="text-muted-foreground">
                    {ev.status === "UPCOMING"
                      ? `${ev._count.items} item${ev._count.items === 1 ? "" : "s"} on the sheet`
                      : `${ev.units} unit${ev.units === 1 ? "" : "s"} sold`}
                  </span>
                  {ev.status !== "UPCOMING" && (
                    <span className="text-ember-200 font-medium tabular-nums">
                      {fmtUsd(ev.revenue)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
