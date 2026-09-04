import "server-only";
import { prisma } from "@/lib/prisma";
import { predictReorders, type ReorderPrediction } from "@/server/crm/predict-reorders";

const REVENUE_STATUSES = ["SENT", "PAID", "PARTIAL", "OVERDUE"] as const;
const OUTSTANDING_STATUSES = ["SENT", "PARTIAL", "OVERDUE"] as const;

export type CRMSnapshot = {
  totals: {
    customers: number;
    activeAccounts: number;
    leads: number;
    inactive: number;
  };
  byCustomerType: { type: string; count: number }[];
  /**
   * Customers predicted to reorder soon, derived from their invoice
   * cadence: last invoice date + average gap between invoices. Needs at
   * least two invoices per customer.
   */
  reorderPipeline: ReorderPrediction[];
  followupsDue: {
    id: string;
    name: string;
    type: string;
    nextFollowup: string;
    daysUntil: number;
  }[];
  outstandingBalance: number;
  revenueThisMonth: number;
};

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (v && typeof v === "object" && "toString" in v) return Number(v.toString());
  return 0;
}

export async function loadCRMSnapshot(): Promise<CRMSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customers,
    customersByType,
    customersByStatus,
    revenueSales,
    followups,
    outstandingAgg,
    monthAgg,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.groupBy({
      by: ["customerType"],
      _count: { _all: true },
    }),
    prisma.customer.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.sale.findMany({
      where: {
        status: { in: [...REVENUE_STATUSES] },
        customer: { archivedAt: null },
      },
      select: {
        customerId: true,
        invoiceDate: true,
        grandTotal: true,
        customer: { select: { businessName: true } },
      },
    }),
    prisma.customer.findMany({
      where: {
        nextFollowupDate: { lte: new Date(now.getTime() + 14 * 86400000) },
        status: { notIn: ["LOST", "INACTIVE"] },
      },
      orderBy: { nextFollowupDate: "asc" },
      take: 10,
      select: {
        id: true,
        businessName: true,
        customerType: true,
        nextFollowupDate: true,
      },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true, amountPaid: true },
      where: { status: { in: [...OUTSTANDING_STATUSES] } },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      where: {
        status: { in: [...REVENUE_STATUSES] },
        invoiceDate: { gte: startOfMonth },
      },
    }),
  ]);

  return {
    totals: {
      customers,
      activeAccounts:
        customersByStatus.find((s) => s.status === "ACTIVE_CUSTOMER")
          ?._count._all ?? 0,
      leads:
        (customersByStatus.find((s) => s.status === "LEAD")?._count._all ??
          0) +
        (customersByStatus.find((s) => s.status === "CONTACTED")?._count._all ??
          0),
      inactive:
        (customersByStatus.find((s) => s.status === "INACTIVE")?._count._all ??
          0) +
        (customersByStatus.find((s) => s.status === "LOST")?._count._all ?? 0),
    },
    byCustomerType: customersByType.map((r) => ({
      type: r.customerType,
      count: r._count._all,
    })),
    reorderPipeline: predictReorders(
      revenueSales.map((s) => ({
        customerId: s.customerId,
        customerName: s.customer.businessName,
        invoiceDate: s.invoiceDate,
        grandTotal: num(s.grandTotal),
      })),
      now,
    ),
    followupsDue: followups.map((c) => {
      const date = c.nextFollowupDate!;
      const days = Math.ceil((date.getTime() - now.getTime()) / 86400000);
      return {
        id: c.id,
        name: c.businessName,
        type: c.customerType,
        nextFollowup: date.toISOString(),
        daysUntil: days,
      };
    }),
    outstandingBalance: Math.max(
      0,
      num(outstandingAgg._sum.grandTotal) - num(outstandingAgg._sum.amountPaid),
    ),
    revenueThisMonth: num(monthAgg._sum.grandTotal),
  };
}
