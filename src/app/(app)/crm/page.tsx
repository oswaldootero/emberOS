import Link from "next/link";
import {
  CalendarClock,
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
import { pretty } from "@/components/crm/status-badge";
import { CustomerListClient } from "@/components/crm/customer-list-client";
import { Pagination, SortableHeader } from "@/components/ui/data-table";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { loadCRMSnapshot } from "@/server/crm";
import { cn, compactNumber } from "@/lib/utils";

export const metadata = { title: "CRM" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const PAGE_SIZE = 25;

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    archived?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const filterType = sp.type ?? "";
  const filterStatus = sp.status ?? "";
  const showArchived = sp.archived === "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const sortField = ["businessName", "createdAt", "updatedAt", "lastContactDate"].includes(sp.sort ?? "")
    ? (sp.sort as "businessName" | "createdAt" | "updatedAt" | "lastContactDate")
    : "updatedAt";
  const sortDir = sp.dir === "asc" ? "asc" : "desc";

  const where = {
    archivedAt: showArchived ? { not: null } : null,
    ...(q && {
      OR: [
        { businessName: { contains: q, mode: "insensitive" as const } },
        { dba: { contains: q, mode: "insensitive" as const } },
        { contactName: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } },
        { mobile: { contains: q, mode: "insensitive" as const } },
        { tags: { has: q } },
      ],
    }),
    ...(filterType && {
      customerType: filterType as "RETAILER" | "LOUNGE" | "DISTRIBUTOR" | "ONLINE_CUSTOMER" | "EVENT_LEAD" | "OTHER",
    }),
    ...(filterStatus && {
      status: filterStatus as "LEAD" | "PROSPECT" | "CONTACTED" | "SAMPLE_SENT" | "OPEN_ACCOUNT" | "ACTIVE_CUSTOMER" | "INACTIVE" | "LOST",
    }),
  };

  const [customers, customerCount, snapshot] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sales: {
          where: { status: { in: ["SENT", "PAID", "PARTIAL", "OVERDUE"] } },
          select: { grandTotal: true },
        },
      },
    }),
    prisma.customer.count({ where }),
    loadCRMSnapshot(),
  ]);
  const pageCount = Math.max(1, Math.ceil(customerCount / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="CRM"
        title="Who we work with."
        description="Retailers, lounges, distributors, online customers, and event leads — all in one ledger."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/crm/analytics">
            <TrendingUp className="h-4 w-4" /> Analytics
          </Link>
        </Button>
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
        <Kpi label="Outstanding balance" value={fmtUsd(snapshot.outstandingBalance)} icon={CalendarClock} accent="text-amber-300" hint={`${fmtUsd(snapshot.revenueThisMonth)} invoiced this month`} />
        <Kpi label="Total customers" value={snapshot.totals.customers.toString()} icon={Users} hint={`${snapshot.totals.inactive} inactive`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reorder pipeline</CardTitle>
            <CardDescription>Predicted from each customer&apos;s invoice cadence.</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.reorderPipeline.length === 0 ? (
              <EmptyHint label="No reorders predicted — needs customers with two or more invoices." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {snapshot.reorderPipeline.map((r) => (
                  <li key={r.customerId} className="py-2 flex items-center gap-3 text-sm">
                    <Link href={`/crm/${r.customerId}`} className="flex-1 min-w-0 hover:text-ember-200">
                      <div className="text-ivory truncate">{r.customerName}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Orders about every {r.avgDaysBetween}d · last {fmtUsd(r.lastTotal)}
                      </div>
                    </Link>
                    <Badge variant={r.daysUntil <= 7 ? "warning" : "outline"} className="text-[10px]">
                      {r.daysUntil < 0 ? `${-r.daysUntil}d overdue` : r.daysUntil === 0 ? "due" : `in ${r.daysUntil}d`}
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
              <CardTitle>{showArchived ? "Archived customers" : "All customers"}</CardTitle>
              <CardDescription>
                {customerCount} total · sorted by{" "}
                <SortableHeader
                  label={
                    { businessName: "name", createdAt: "created", updatedAt: "recent activity", lastContactDate: "last contact" }[sortField]
                  }
                  field={sortField === "updatedAt" ? "businessName" : "updatedAt"}
                  currentSort={sortField}
                  currentDir={sortDir}
                  basePath="/crm"
                  baseQuery={{ q, type: filterType, status: filterStatus, archived: sp.archived }}
                  className="text-ember-200"
                />
              </CardDescription>
            </div>
            <form className="flex items-center gap-2 flex-wrap">
              {showArchived && <input type="hidden" name="archived" value="1" />}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Search name, contact, phone, tag…"
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
                <option value="OTHER">Other</option>
              </select>
              <select
                name="status"
                defaultValue={filterStatus}
                className="h-9 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory"
              >
                <option value="">All statuses</option>
                <option value="LEAD">Lead</option>
                <option value="PROSPECT">Prospect</option>
                <option value="CONTACTED">Contacted</option>
                <option value="SAMPLE_SENT">Sample sent</option>
                <option value="OPEN_ACCOUNT">Open account</option>
                <option value="ACTIVE_CUSTOMER">Active customer</option>
                <option value="INACTIVE">Inactive</option>
                <option value="LOST">Lost</option>
              </select>
              <Button variant="outline" size="sm" type="submit">Apply</Button>
              <Link
                href={showArchived ? "/crm" : "/crm?archived=1"}
                className="text-[11px] text-muted-foreground hover:text-ivory underline-offset-2 hover:underline"
              >
                {showArchived ? "Show active" : "Show archived"}
              </Link>
            </form>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {customers.length === 0 ? (
            <div className="text-sm text-muted-foreground italic text-center py-8">
              No customers match. Try different filters, or add your first.
            </div>
          ) : (
            <>
            <CustomerListClient
              isAdmin={user.role === "ADMIN"}
              rows={customers.map((c) => {
                const salesTotal = c.sales.reduce(
                  (s, x) => s + Number(x.grandTotal?.toString() ?? 0),
                  0,
                );
                return {
                  id: c.id,
                  businessName: c.businessName,
                  contactName: c.contactName,
                  email: c.email,
                  customerType: c.customerType,
                  status: c.status,
                  lastContactDate: c.lastContactDate
                    ? c.lastContactDate.toISOString()
                    : null,
                  nextFollowupDate: c.nextFollowupDate
                    ? c.nextFollowupDate.toISOString()
                    : null,
                  ordersCount: c.sales.length,
                  ordersTotal: salesTotal,
                };
              })}
            />
            <div className="pt-4">
              <Pagination
                page={page}
                pageCount={pageCount}
                total={customerCount}
                basePath="/crm"
                baseQuery={{ q, type: filterType, status: filterStatus, archived: sp.archived, sort: sp.sort, dir: sp.dir }}
                noun="customers"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 italic">
              Tip: click any status badge or follow-up date to edit inline.
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

function EmptyHint({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground italic py-2">{label}</div>;
}

// keep compactNumber referenced so it can be used later for graph axes
void compactNumber;
