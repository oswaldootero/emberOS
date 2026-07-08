import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
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
  BreakdownPie,
  CustomerGrowthChart,
  RevenueByMonthChart,
  TopCustomersChart,
} from "@/components/crm/analytics-charts";
import { SaleStatusBadge, pretty } from "@/components/sales/status-badge";
import { requireUser } from "@/server/auth";
import { loadCRMAnalytics } from "@/server/crm-analytics";

export const metadata = { title: "Customer Analytics" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

export default async function CRMAnalyticsPage() {
  await requireUser();
  const a = await loadCRMAnalytics();

  const retentionData = [
    { name: "Returning", value: a.retention.returning },
    { name: "One-time", value: a.retention.oneTime },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Customer analytics"
        description="Revenue, growth, retention, and lifetime value — computed from real invoices."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4" /> Back to CRM
          </Link>
        </Button>
      </PageHeader>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Total customers" value={String(a.kpis.totalCustomers)} hint={`${a.kpis.activeCustomers} active`} />
        <Kpi icon={TrendingUp} label="New this month" value={String(a.kpis.newCustomersThisMonth)} />
        <Kpi icon={DollarSign} label="Total revenue" value={fmtUsd(a.kpis.totalRevenue)} accent="text-ember-200" hint={`${fmtUsd(a.kpis.revenueThisMonth)} this month`} />
        <Kpi icon={Wallet} label="Outstanding receivables" value={fmtUsd(a.kpis.outstandingReceivables)} accent={a.kpis.outstandingReceivables > 0 ? "text-amber-300" : undefined} />
        <Kpi icon={Receipt} label="Average invoice" value={fmtUsd(a.kpis.averageInvoice)} />
        <Kpi icon={Users} label="Avg revenue / customer" value={fmtUsd(a.kpis.averageRevenuePerCustomer)} />
        <Kpi
          icon={TrendingUp}
          label="Purchase frequency"
          value={a.avgDaysBetweenPurchases ? `${Math.round(a.avgDaysBetweenPurchases)} days` : "—"}
          hint="avg days between purchases"
        />
        <Kpi
          icon={Users}
          label="Retention"
          value={
            a.retention.returning + a.retention.oneTime > 0
              ? `${Math.round((a.retention.returning / (a.retention.returning + a.retention.oneTime)) * 100)}%`
              : "—"
          }
          hint={`${a.retention.returning} returning · ${a.retention.oneTime} one-time`}
        />
      </div>

      {/* Revenue + top customers */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by month</CardTitle>
            <CardDescription>Last 12 months, all non-void invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.kpis.totalRevenue === 0 ? (
              <Empty label="No revenue yet — create your first invoice." />
            ) : (
              <RevenueByMonthChart data={a.revenueByMonth} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 10 customers</CardTitle>
            <CardDescription>By lifetime revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.topCustomers.length === 0 ? (
              <Empty label="No customer revenue yet." />
            ) : (
              <TopCustomersChart data={a.topCustomers} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Growth + type + status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer growth</CardTitle>
            <CardDescription>New customers per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerGrowthChart data={a.customerGrowth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sales by customer type</CardTitle>
            <CardDescription>Revenue mix across channels.</CardDescription>
          </CardHeader>
          <CardContent>
            {a.salesByType.length === 0 ? (
              <Empty label="No sales yet." />
            ) : (
              <BreakdownPie
                data={a.salesByType.map((t) => ({ name: pretty(t.type), value: t.revenue }))}
                nameKey="name"
                valueKey="value"
                valueFormatter={fmtUsd}
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Invoice status</CardTitle>
            <CardDescription>Where every invoice stands.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {a.invoiceStatusBreakdown.length === 0 ? (
              <Empty label="No invoices yet." />
            ) : (
              a.invoiceStatusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center justify-between gap-3">
                  <SaleStatusBadge status={s.status} />
                  <div className="flex-1 text-right text-xs text-muted-foreground">
                    {s.count} invoice{s.count === 1 ? "" : "s"}
                  </div>
                  <div className="text-sm text-ivory tabular-nums w-24 text-right">
                    {fmtUsd(s.total)}
                  </div>
                </div>
              ))
            )}
            {retentionData.length > 0 && (
              <div className="pt-3 mt-3 border-t border-white/[0.05]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Returning vs new
                </div>
                <BreakdownPie
                  data={retentionData}
                  nameKey="name"
                  valueKey="value"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CLV ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Customer lifetime value</CardTitle>
          <CardDescription>Top 20 accounts ranked by lifetime revenue.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {a.lifetimeValueRanking.length === 0 ? (
            <Empty label="Rankings appear once invoices exist." />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
                    <th className="text-left font-normal py-2 px-2">#</th>
                    <th className="text-left font-normal py-2 px-2">Customer</th>
                    <th className="text-left font-normal py-2 px-2">Type</th>
                    <th className="text-right font-normal py-2 px-2">Invoices</th>
                    <th className="text-left font-normal py-2 px-2 hidden md:table-cell">First</th>
                    <th className="text-left font-normal py-2 px-2 hidden md:table-cell">Latest</th>
                    <th className="text-right font-normal py-2 px-2">Lifetime revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {a.lifetimeValueRanking.map((c, i) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-2 text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="py-2 px-2">
                        <Link href={`/crm/${c.id}`} className="text-ivory hover:text-ember-200">
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-[10px]">{pretty(c.type)}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{c.invoices}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground hidden md:table-cell">{fmtDate(c.firstPurchase)}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground hidden md:table-cell">{fmtDate(c.lastPurchase)}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-ember-200">{fmtUsd(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={`h-4 w-4 ${accent ?? "text-ember-300/80"}`} />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <div className={`font-display text-2xl md:text-3xl tracking-tight tabular-nums ${accent ?? "text-ivory"}`}>
          {value}
        </div>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground italic text-center py-10">{label}</p>
  );
}
