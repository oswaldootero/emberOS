import "server-only";
import { prisma } from "@/lib/prisma";
import {
  snapshotItem,
  computeStatus,
  velocity,
  aggregateSoldLines,
  n,
  type Velocity,
} from "./inventory/calculator";

export type InventorySnapshot = {
  totals: {
    distinctSKUs: number;
    totalPackages: number;
    totalUnits: number;
    valueAtCost: number;
    valueAtWholesale: number;
  };
  status: {
    active: number;
    lowStock: number;
    outOfStock: number;
    discontinued: number;
  };
  lowStockItems: ReturnType<typeof snapshotItem>[];
  outOfStockItems: ReturnType<typeof snapshotItem>[];
  bestSellingSkus: {
    id: string;
    sku: string;
    productName: string;
    packagesSold: number;
    revenue: number;
  }[];
  soldThisMonthPackages: number;
  soldThisMonthRevenue: number;
  salesByCustomer: {
    customerId: string;
    customerName: string;
    packages: number;
    revenue: number;
  }[];
  salesByChannel: {
    channel: string;
    packages: number;
    revenue: number;
  }[];
  reorderRecommendations: {
    id: string;
    sku: string;
    productName: string;
    packagesOnHand: number;
    reorderThreshold: number;
    preferredReorderQty: number;
    velocity: Velocity;
    reason: string;
  }[];
};

const REVENUE_STATUSES = ["SENT", "PAID", "PARTIAL", "OVERDUE"] as const;

export async function loadInventorySnapshot(
  velocityWindowDays = 30,
): Promise<InventorySnapshot> {
  const since = new Date(Date.now() - velocityWindowDays * 86400000);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Sales come from invoice line items. Rows from cancelled/draft
  // invoices are excluded; the window is by invoice date.
  const [items, windowLines, monthLines] = await Promise.all([
    prisma.inventoryItem.findMany({ orderBy: { productName: "asc" } }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          status: { in: [...REVENUE_STATUSES] },
          invoiceDate: { gte: since },
        },
      },
      select: {
        inventoryItemId: true,
        quantity: true,
        lineTotal: true,
        sale: {
          select: {
            customerId: true,
            customer: { select: { businessName: true, customerType: true } },
          },
        },
      },
    }),
    prisma.saleItem.findMany({
      where: {
        sale: {
          status: { in: [...REVENUE_STATUSES] },
          invoiceDate: { gte: startOfMonth },
        },
      },
      select: { quantity: true, lineTotal: true },
    }),
  ]);

  const snapshots = items.map(snapshotItem);

  const agg = aggregateSoldLines(
    windowLines.map((l) => ({
      inventoryItemId: l.inventoryItemId,
      quantity: l.quantity,
      lineTotal: n(l.lineTotal),
      customerId: l.sale.customerId,
      customerName: l.sale.customer.businessName,
      customerType: l.sale.customer.customerType,
    })),
  );

  const itemById = new Map(items.map((i) => [i.id, i]));
  const bestSellingSkus = Array.from(agg.bySku.entries())
    .map(([id, v]) => {
      const meta = itemById.get(id);
      return {
        id,
        sku: meta?.sku ?? "(unknown)",
        productName: meta?.productName ?? "(unknown)",
        packagesSold: v.packagesSold,
        revenue: v.revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const salesById = new Map<string, number>();
  for (const [id, v] of agg.bySku) salesById.set(id, v.packagesSold);

  const soldThisMonthPackages = monthLines.reduce((s, l) => s + l.quantity, 0);
  const soldThisMonthRevenue = monthLines.reduce((s, l) => s + n(l.lineTotal), 0);

  // Build per-SKU velocity → reorder recommendations

  const reorderRecommendations: InventorySnapshot["reorderRecommendations"] = [];
  for (const item of items) {
    if (item.status === "DISCONTINUED") continue;
    const sold = salesById.get(item.id) ?? 0;
    const v = velocity(
      item.packagesOnHand,
      sold,
      velocityWindowDays,
      item.reorderThreshold,
    );
    const cs = computeStatus(item);
    const shouldRecommend =
      cs === "OUT_OF_STOCK" ||
      cs === "LOW_STOCK" ||
      (v?.recommendReorder ?? false);
    if (shouldRecommend) {
      const reason =
        cs === "OUT_OF_STOCK"
          ? "Out of stock"
          : cs === "LOW_STOCK"
            ? `Below threshold (${item.packagesOnHand} ≤ ${item.reorderThreshold})`
            : v
              ? `Will fall below threshold in ${Math.ceil(v.daysOfStockRemaining)}d at current velocity`
              : "Sales velocity is low — review";
      reorderRecommendations.push({
        id: item.id,
        sku: item.sku,
        productName: item.productName,
        packagesOnHand: item.packagesOnHand,
        reorderThreshold: item.reorderThreshold,
        preferredReorderQty: item.preferredReorderQty,
        velocity: v,
        reason,
      });
    }
  }

  return {
    totals: {
      distinctSKUs: items.length,
      totalPackages: items.reduce((s, i) => s + i.packagesOnHand, 0),
      totalUnits: snapshots.reduce((s, sn) => s + sn.unitsOnHand, 0),
      valueAtCost: snapshots.reduce((s, sn) => s + sn.inventoryValueCost, 0),
      valueAtWholesale: snapshots.reduce(
        (s, sn) => s + sn.inventoryValueWholesale,
        0,
      ),
    },
    status: {
      active: snapshots.filter((s) => s.computedStatus === "ACTIVE").length,
      lowStock: snapshots.filter((s) => s.computedStatus === "LOW_STOCK").length,
      outOfStock: snapshots.filter((s) => s.computedStatus === "OUT_OF_STOCK")
        .length,
      discontinued: snapshots.filter((s) => s.computedStatus === "DISCONTINUED")
        .length,
    },
    lowStockItems: snapshots.filter((s) => s.computedStatus === "LOW_STOCK"),
    outOfStockItems: snapshots.filter((s) => s.computedStatus === "OUT_OF_STOCK"),
    bestSellingSkus,
    soldThisMonthPackages,
    soldThisMonthRevenue,
    salesByCustomer: agg.salesByCustomer,
    salesByChannel: agg.salesByChannel,
    reorderRecommendations,
  };
}
