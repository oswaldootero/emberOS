import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  Plus,
  Search,
  TrendingUp,
  Users,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomerStatusBadge, pretty } from "@/components/crm/status-badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { loadCRMSnapshot } from "@/server/crm";
import { cn, compactNumber, relativeTime } from "@/lib/utils";

export const metadata = { title: "CRM" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
  }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const filterType = sp.type ?? "";
  const filterStatus = sp.status ?? "";

  const [customers, snapshot] = await Promise.all([
    prisma.customer.findMany({
      where: {
        ...(q && {
          OR: [
            { businessName: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }),
        ...(filterType && {
          customerType: filterType as "RETAILER" | "LOUNGE" | "DISTRIBUTOR" | "ONLINE_CUSTOMER" | "EVENT_LEAD",
        }),
        ...(filterStatus && {
          status: filterStatus as "LEAD" | "CONTACTED" | "SAMPLE_SENT" | "OPEN_ACCOUNT" | "ACTIVE_CUSTOMER" | "INACTIVE" | "LOST",
        }),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        orders: {
          select: { totalRevenue: true },
        },
      },
    }),
    loadCRMSnapshot(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Who we work with."
        description="Retailers, lounges, distributors, online customers, and event leads — all in one ledger."
      >
        <Button variant="gold" size="sm" asChild>
          <Link href="/crm/new">
            <Plus className="h-4 w-4" /> Add Customer
          </Link>
        </Button>
      </PageHeader>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Active accounts" value={snapshot.totals.activeAccounts.toString()} icon={Users} accent="text-emerald-300" />
        <Kpi label="Leads in flight" value={snapshot.totals.leads.toString()} icon={TrendingUp} />
        <Kpi label="Broker commissions owed" value={fmtUsd(snapshot.brokerCommissionsOwed)} icon={CalendarClock} accent="text-amber-300" hint={`${fmtUsd(snapshot.brokerCommissionsThisMonth)} this month`} />
        <Kpi label="Total customers" value={snapshot.totals.customers.toString()} icon={Users} hint={`${snapshot.totals.inactive} inactive`} />
      </div>

      {/* Rollups */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads by source</CardTitle>
            <CardDescription>Where new customers are coming from.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.leadsBySource.length === 0 ? (
              <EmptyHint label="No leads tagged with a source yet." />
            ) : (
              <ul className="space-y-1.5">
                {snapshot.leadsBySource.map((row) => (
                  <li key={row.source} className="flex items-center justify-between text-sm">
                    <span className="text-ivory">{pretty(row.source)}</span>
                    <Badge variant="outline" className="text-[10px]">{row.count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by channel</CardTitle>
            <CardDescription>From recorded orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.revenueByChannel.length === 0 ? (
              <EmptyHint label="No orders recorded yet." />
            ) : (
              <ul className="space-y-1.5">
                {snapshot.revenueByChannel.map((row) => (
                  <li key={row.channel} className="flex items-center justify-between text-sm">
                    <span className="text-ivory">{pretty(row.channel)}</span>
                    <span className="text-ember-200 tabular-nums">{fmtUsd(row.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top customers</CardTitle>
            <CardDescription>By total revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.topCustomers.length === 0 ? (
              <EmptyHint label="No order data yet." />
            ) : (
              <ul className="space-y-1.5">
                {snapshot.topCustomers.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <Link href={`/crm/${c.id}`} className="flex-1 truncate text-ivory hover:text-ember-200">
                      {c.name}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">{c.orderCount} orders</span>
                    <span className="text-ember-200 tabular-nums">{fmtUsd(c.revenue)}</span>
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
            <CardTitle className="text-base">Reorder pipeline</CardTitle>
            <CardDescription>Next 8 reorders due.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.reorderPipeline.length === 0 ? (
              <EmptyHint label="No upcoming reorders." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.reorderPipeline.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="text-ivory truncate">{r.customerName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{r.product}</div>
                    </div>
                    <Badge variant={r.daysUntil <= 7 ? "warning" : "outline"} className="text-[10px]">
                      {r.daysUntil <= 0 ? "due" : `in ${r.daysUntil}d`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-ups due</CardTitle>
            <CardDescription>Customers worth a personal touch this week.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.followupsDue.length === 0 ? (
              <EmptyHint label="No follow-ups scheduled in the next 14 days." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.followupsDue.map((f) => (
                  <li key={f.id} className="py-2 flex items-center gap-3 text-sm">
                    <Link href={`/crm/${f.id}`} className="flex-1 truncate text-ivory hover:text-ember-200">
                      {f.name}
                    </Link>
                    <Badge variant="outline" className="text-[10px]">{pretty(f.type)}</Badge>
                    <span className={cn("text-[10px] tabular-nums",
                      f.daysUntil <= 0 ? "text-amber-300" : "text-muted-foreground"
                    )}>
                      {f.daysUntil <= 0 ? "today" : `in ${f.daysUntil}d`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>All customers</CardTitle>
              <CardDescription>{customers.length} showing</CardDescription>
            </div>
            <form className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search…"
                  className="pl-8 w-56 h-9"
                />
              </div>
              <select
                name="type"
                defaultValue={filterType}
                className="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory"
              >
                <option value="">All types</option>
                <option value="RETAILER">Retailer</option>
                <option value="LOUNGE">Lounge</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="ONLINE_CUSTOMER">Online customer</option>
                <option value="EVENT_LEAD">Event lead</option>
              </select>
              <select
                name="status"
                defaultValue={filterStatus}
                className="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory"
              >
                <option value="">All statuses</option>
                <option value="LEAD">Lead</option>
                <option value="CONTACTED">Contacted</option>
                <option value="SAMPLE_SENT">Sample sent</option>
                <option value="OPEN_ACCOUNT">Open account</option>
                <option value="ACTIVE_CUSTOMER">Active customer</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOST">Lost</option>
              </select>
              <Button variant="outline" size="sm" type="submit">Apply</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {customers.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8">
              No customers match. Try different filters, or add your first.
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {customers.map((c) => {
                const total = c.orders.reduce(
                  (s, o) => s + Number(o.totalRevenue?.toString() ?? 0),
                  0,
                );
                return (
                  <li key={c.id} className="py-3">
                    <Link href={`/crm/${c.id}`} className="flex items-center gap-3 hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ivory truncate">{c.businessName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {c.contactName ?? "—"}
                          {c.email && <span> · {c.email}</span>}
                          {c.lastContactDate && (
                            <span> · last contact {relativeTime(c.lastContactDate)}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{pretty(c.customerType)}</Badge>
                      <CustomerStatusBadge status={c.status} />
                      {c.orders.length > 0 && (
                        <div className="text-[10px] text-ember-200 tabular-nums shrink-0">
                          {c.orders.length} orders · {fmtUsd(total)}
                        </div>
                      )}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  </li>
                );
              })}
            </ul>
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

function EmptyHint({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground italic py-2">{label}</div>;
}

// keep compactNumber referenced so it can be used later for graph axes
void compactNumber;
