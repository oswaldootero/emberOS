import "server-only";
import { prisma } from "@/lib/prisma";
import { n } from "@/server/sales";

// Sales that count toward revenue (everything except drafts + voids)
const REVENUE_STATUSES = ["SENT", "PAID", "PARTIAL", "OVERDUE"] as const;
const OUTSTANDING_STATUSES = ["SENT", "PARTIAL", "OVERDUE"] as const;

export type CRMAnalytics = {
  kpis: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomersThisMonth: number;
    totalRevenue: number;
    revenueThisMonth: number;
    averageInvoice: number;
    averageRevenuePerCustomer: number;
    outstandingReceivables: number;
  };
  revenueByMonth: { month: string; revenue: number; invoices: number }[];
  topCustomers: { id: string; name: string; revenue: number; invoices: number }[];
  customerGrowth: { month: string; newCustomers: number }[];
  salesByType: { type: string; revenue: number; count: number }[];
  invoiceStatusBreakdown: { status: string; count: number; total: number }[];
  retention: { returning: number; oneTime: number };
  avgDaysBetweenPurchases: number | null;
  lifetimeValueRanking: {
    id: string;
    name: string;
    type: string;
    revenue: number;
    invoices: number;
    firstPurchase: string | null;
    lastPurchase: string | null;
  }[];
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonths(count: number): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
}

export async function loadCRMAnalytics(): Promise<CRMAnalytics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    totalCustomers,
    activeCustomers,
    newThisMonth,
    revenueAgg,
    monthRevenueAgg,
    invoiceCount,
    outstandingAgg,
    statusGroups,
    recentSales,
    customersCreated,
    byCustomer,
  ] = await Promise.all([
    prisma.customer.count({ where: { archivedAt: null } }),
    prisma.customer.count({
      where: { archivedAt: null, status: "ACTIVE_CUSTOMER" },
    }),
    prisma.customer.count({
      where: { archivedAt: null, createdAt: { gte: startOfMonth } },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: { _all: true },
      where: { status: { in: [...REVENUE_STATUSES] } },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      where: {
        status: { in: [...REVENUE_STATUSES] },
        invoiceDate: { gte: startOfMonth },
      },
    }),
    prisma.sale.count({ where: { status: { in: [...REVENUE_STATUSES] } } }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true, amountPaid: true },
      where: { status: { in: [...OUTSTANDING_STATUSES] } },
    }),
    prisma.sale.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    // 12-month window for the time-series charts. Selecting only the
    // columns we roll up keeps this reasonable even at 10k+ invoices.
    prisma.sale.findMany({
      where: {
        invoiceDate: { gte: twelveMonthsAgo },
        status: { in: [...REVENUE_STATUSES] },
      },
      select: {
        invoiceDate: true,
        grandTotal: true,
        customer: { select: { customerType: true } },
      },
    }),
    prisma.customer.findMany({
      where: { createdAt: { gte: twelveMonthsAgo }, archivedAt: null },
      select: { createdAt: true },
    }),
    prisma.sale.groupBy({
      by: ["customerId"],
      _count: { _all: true },
      _sum: { grandTotal: true },
      _min: { invoiceDate: true },
      _max: { invoiceDate: true },
      where: { status: { in: [...REVENUE_STATUSES] } },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 50,
    }),
  ]);

  // Hydrate customer names for rankings
  const custIds = byCustomer.map((c) => c.customerId);
  const custRows = custIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: custIds } },
        select: { id: true, businessName: true, customerType: true },
      })
    : [];
  const custById = new Map(custRows.map((c) => [c.id, c]));

  // Month buckets
  const months = lastNMonths(12);
  const revByMonth = new Map(months.map((m) => [m, { revenue: 0, invoices: 0 }]));
  const typeMap = new Map<string, { revenue: number; count: number }>();
  for (const s of recentSales) {
    const k = monthKey(s.invoiceDate);
    const bucket = revByMonth.get(k);
    if (bucket) {
      bucket.revenue += n(s.grandTotal);
      bucket.invoices += 1;
    }
    const t = s.customer?.customerType ?? "OTHER";
    const tv = typeMap.get(t) ?? { revenue: 0, count: 0 };
    tv.revenue += n(s.grandTotal);
    tv.count += 1;
    typeMap.set(t, tv);
  }

  const growthByMonth = new Map(months.map((m) => [m, 0]));
  for (const c of customersCreated) {
    const k = monthKey(c.createdAt);
    if (growthByMonth.has(k)) growthByMonth.set(k, growthByMonth.get(k)! + 1);
  }

  // Retention + purchase frequency from the per-customer rollup
  let returning = 0;
  let oneTime = 0;
  let freqNumerator = 0; // sum of (span / (invoices-1)) across returning customers
  let freqDenominator = 0;
  for (const c of byCustomer) {
    if (c._count._all >= 2) {
      returning++;
      const first = c._min.invoiceDate?.getTime() ?? 0;
      const last = c._max.invoiceDate?.getTime() ?? 0;
      if (last > first) {
        freqNumerator += (last - first) / 86400000 / (c._count._all - 1);
        freqDenominator++;
      }
    } else if (c._count._all === 1) {
      oneTime++;
    }
  }

  const totalRevenue = n(revenueAgg._sum.grandTotal);
  const payingCustomers = byCustomer.length;

  return {
    kpis: {
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth: newThisMonth,
      totalRevenue,
      revenueThisMonth: n(monthRevenueAgg._sum.grandTotal),
      averageInvoice: invoiceCount > 0 ? totalRevenue / invoiceCount : 0,
      averageRevenuePerCustomer:
        payingCustomers > 0 ? totalRevenue / payingCustomers : 0,
      outstandingReceivables:
        n(outstandingAgg._sum.grandTotal) - n(outstandingAgg._sum.amountPaid),
    },
    revenueByMonth: months.map((m) => ({
      month: m,
      revenue: Math.round(revByMonth.get(m)!.revenue),
      invoices: revByMonth.get(m)!.invoices,
    })),
    topCustomers: byCustomer.slice(0, 10).map((c) => ({
      id: c.customerId,
      name: custById.get(c.customerId)?.businessName ?? "(unknown)",
      revenue: n(c._sum.grandTotal),
      invoices: c._count._all,
    })),
    customerGrowth: months.map((m) => ({
      month: m,
      newCustomers: growthByMonth.get(m)!,
    })),
    salesByType: Array.from(typeMap.entries())
      .map(([type, v]) => ({ type, revenue: Math.round(v.revenue), count: v.count }))
      .sort((a, b) => b.revenue - a.revenue),
    invoiceStatusBreakdown: statusGroups.map((s) => ({
      status: s.status,
      count: s._count._all,
      total: n(s._sum.grandTotal),
    })),
    retention: { returning, oneTime },
    avgDaysBetweenPurchases:
      freqDenominator > 0 ? freqNumerator / freqDenominator : null,
    lifetimeValueRanking: byCustomer.slice(0, 20).map((c) => {
      const cust = custById.get(c.customerId);
      return {
        id: c.customerId,
        name: cust?.businessName ?? "(unknown)",
        type: cust?.customerType ?? "OTHER",
        revenue: n(c._sum.grandTotal),
        invoices: c._count._all,
        firstPurchase: c._min.invoiceDate?.toISOString() ?? null,
        lastPurchase: c._max.invoiceDate?.toISOString() ?? null,
      };
    }),
  };
}

// ─────────────────────────────────────────────────────────────────
// Per-customer analytics — powers the customer page Analytics tab
// ─────────────────────────────────────────────────────────────────

export type CustomerAnalytics = {
  lifetimeRevenue: number;
  outstandingBalance: number;
  invoiceCount: number;
  averageOrder: number;
  largestOrder: number;
  firstPurchase: string | null;
  lastPurchase: string | null;
  avgDaysBetween: number | null;
  revenueByMonth: { month: string; revenue: number }[];
};

export async function loadCustomerAnalytics(
  customerId: string,
): Promise<CustomerAnalytics> {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);

  const [agg, maxAgg, outstanding, series] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: { _all: true },
      _min: { invoiceDate: true },
      _max: { invoiceDate: true },
      where: { customerId, status: { in: [...REVENUE_STATUSES] } },
    }),
    prisma.sale.aggregate({
      _max: { grandTotal: true },
      where: { customerId, status: { in: [...REVENUE_STATUSES] } },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true, amountPaid: true },
      where: { customerId, status: { in: [...OUTSTANDING_STATUSES] } },
    }),
    prisma.sale.findMany({
      where: {
        customerId,
        status: { in: [...REVENUE_STATUSES] },
        invoiceDate: { gte: twelveMonthsAgo },
      },
      select: { invoiceDate: true, grandTotal: true },
    }),
  ]);

  const months = lastNMonths(12);
  const revByMonth = new Map(months.map((m) => [m, 0]));
  for (const s of series) {
    const k = monthKey(s.invoiceDate);
    if (revByMonth.has(k)) revByMonth.set(k, revByMonth.get(k)! + n(s.grandTotal));
  }

  const count = agg._count._all;
  const first = agg._min.invoiceDate;
  const last = agg._max.invoiceDate;
  const revenue = n(agg._sum.grandTotal);

  return {
    lifetimeRevenue: revenue,
    outstandingBalance:
      n(outstanding._sum.grandTotal) - n(outstanding._sum.amountPaid),
    invoiceCount: count,
    averageOrder: count > 0 ? revenue / count : 0,
    largestOrder: n(maxAgg._max.grandTotal),
    firstPurchase: first?.toISOString() ?? null,
    lastPurchase: last?.toISOString() ?? null,
    avgDaysBetween:
      count >= 2 && first && last && last > first
        ? (last.getTime() - first.getTime()) / 86400000 / (count - 1)
        : null,
    revenueByMonth: months.map((m) => ({
      month: m,
      revenue: Math.round(revByMonth.get(m)!),
    })),
  };
}
