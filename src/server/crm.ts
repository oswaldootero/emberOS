import "server-only";
import { prisma } from "@/lib/prisma";

export type CRMSnapshot = {
  totals: {
    customers: number;
    activeAccounts: number;
    leads: number;
    inactive: number;
  };
  byCustomerType: { type: string; count: number }[];
  reorderPipeline: {
    id: string;
    customerName: string;
    product: string;
    dueDate: string;
    daysUntil: number;
  }[];
  followupsDue: {
    id: string;
    name: string;
    type: string;
    nextFollowup: string;
    daysUntil: number;
  }[];
  brokerCommissionsOwed: number;
  brokerCommissionsThisMonth: number;
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
    upcomingReorders,
    followups,
    totalBrokerOwedAgg,
    monthBrokerAgg,
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
    prisma.order.findMany({
      where: {
        reorderDueDate: { gte: now },
      },
      orderBy: { reorderDueDate: "asc" },
      take: 8,
      include: { customer: { select: { businessName: true } } },
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
    prisma.order.aggregate({
      _sum: { brokerCommission: true },
      where: { paymentStatus: "PAID" },
    }),
    prisma.order.aggregate({
      _sum: { brokerCommission: true },
      where: {
        paymentStatus: "PAID",
        orderDate: { gte: startOfMonth },
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
    reorderPipeline: upcomingReorders.map((o) => {
      const due = o.reorderDueDate ?? new Date();
      const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      return {
        id: o.id,
        customerName: o.customer?.businessName ?? "—",
        product: o.product,
        dueDate: due.toISOString(),
        daysUntil: days,
      };
    }),
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
    brokerCommissionsOwed: num(totalBrokerOwedAgg._sum.brokerCommission),
    brokerCommissionsThisMonth: num(monthBrokerAgg._sum.brokerCommission),
  };
}
