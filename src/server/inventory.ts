import "server-only";
import { prisma } from "@/lib/prisma";
import { snapshotItem, computeStatus, velocity, n, type Velocity } from "./inventory/calculator";

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

export async function loadInventorySnapshot(
  velocityWindowDays = 30,
): Promise<InventorySnapshot> {
  const since = new Date(Date.now() - velocityWindowDays * 86400000);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [items, salesAgg, monthAgg, byCustomerAgg, byChannelRows] =
    await Promise.all([
      prisma.inventoryItem.findMany({ orderBy: { productName: "asc" } }),
      prisma.order.groupBy({
        by: ["inventoryItemId"],
        where: {
          inventoryItemId: { not: null },
          orderDate: { gte: since },
        },
        _sum: { boxQuantity: true, totalRevenue: true },
      }),
      prisma.order.aggregate({
        where: { orderDate: { gte: startOfMonth } },
        _sum: { boxQuantity: true, totalRevenue: true },
      }),
      prisma.order.groupBy({
        by: ["customerId"],
        where: {
          orderDate: { gte: since },
          inventoryItemId: { not: null },
        },
        _sum: { boxQuantity: true, totalRevenue: true },
        orderBy: { _sum: { totalRevenue: "desc" } },
        take: 6,
      }),
      prisma.order.findMany({
        where: {
          orderDate: { gte: since },
          inventoryItemId: { not: null },
        },
        select: {
          boxQuantity: true,
          totalRevenue: true,
          customer: { select: { customerType: true } },
        },
      }),
    ]);

  const snapshots = items.map(snapshotItem);

  // Top sellers — hydrate names
  const topSkuIds = salesAgg
    .map((s) => s.inventoryItemId)
    .filter((id): id is string => Boolean(id));
  const skuMeta = topSkuIds.length
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: topSkuIds } },
        select: { id: true, sku: true, productName: true },
      })
    : [];
  const skuById = new Map(skuMeta.map((s) => [s.id, s]));

  const bestSellingSkus = salesAgg
    .map((s) => {
      const meta = s.inventoryItemId ? skuById.get(s.inventoryItemId) : null;
      return {
        id: s.inventoryItemId ?? "",
        sku: meta?.sku ?? "(unknown)",
        productName: meta?.productName ?? "(unknown)",
        packagesSold: s._sum.boxQuantity ?? 0,
        revenue: n(s._sum.totalRevenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Sales by customer — hydrate names
  const custIds = byCustomerAgg.map((r) => r.customerId);
  const customerMeta = custIds.length
    ? await prisma.customer.findMany({
        where: { id: { in: custIds } },
        select: { id: true, businessName: true },
      })
    : [];
  const custById = new Map(customerMeta.map((c) => [c.id, c.businessName]));

  const salesByCustomer = byCustomerAgg.map((r) => ({
    customerId: r.customerId,
    customerName: custById.get(r.customerId) ?? "(unknown)",
    packages: r._sum.boxQuantity ?? 0,
    revenue: n(r._sum.totalRevenue),
  }));

  // Sales by channel — fold by customer type
  const channelMap = new Map<
    string,
    { channel: string; packages: number; revenue: number }
  >();
  for (const row of byChannelRows) {
    const ch = row.customer?.customerType ?? "UNKNOWN";
    const existing =
      channelMap.get(ch) ?? { channel: ch, packages: 0, revenue: 0 };
    existing.packages += row.boxQuantity;
    existing.revenue += n(row.totalRevenue);
    channelMap.set(ch, existing);
  }

  // Build per-SKU velocity → reorder recommendations
  const salesById = new Map<string, number>();
  for (const s of salesAgg) {
    if (s.inventoryItemId) {
      salesById.set(s.inventoryItemId, s._sum.boxQuantity ?? 0);
    }
  }

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
    soldThisMonthPackages: monthAgg._sum.boxQuantity ?? 0,
    soldThisMonthRevenue: n(monthAgg._sum.totalRevenue),
    salesByCustomer,
    salesByChannel: Array.from(channelMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    ),
    reorderRecommendations,
  };
}
