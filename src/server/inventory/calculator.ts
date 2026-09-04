import type { InventoryItem } from "@prisma/client";

/**
 * Pure inventory math — derivations, status logic, value, velocity.
 * Keep deterministic and side-effect-free so it's easy to test and embed
 * in dashboards/projections.
 */

export function n(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (v && typeof v === "object" && "toString" in v) return Number(v.toString());
  return 0;
}

export type ItemSnapshot = {
  id: string;
  sku: string;
  productName: string;
  blend: string | null;
  packagingType: string;
  unitsPerPackage: number;
  packagesOnHand: number;
  unitsOnHand: number;
  costPerUnit: number;
  wholesalePrice: number;
  retailPrice: number;
  reorderThreshold: number;
  preferredReorderQty: number;
  status: string;
  computedStatus: "ACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK" | "DISCONTINUED";
  inventoryValueCost: number; // packagesOnHand * unitsPerPackage * costPerUnit
  inventoryValueWholesale: number; // packagesOnHand * wholesalePrice
  inventoryValueRetail: number;
};

/**
 * Derive computed status from raw fields. Honors DISCONTINUED — never
 * overrides it. Otherwise: 0 = OUT_OF_STOCK; ≤ threshold = LOW_STOCK;
 * else ACTIVE.
 */
export function computeStatus(
  item: Pick<InventoryItem, "status" | "packagesOnHand" | "reorderThreshold">,
): ItemSnapshot["computedStatus"] {
  if (item.status === "DISCONTINUED") return "DISCONTINUED";
  if (item.packagesOnHand <= 0) return "OUT_OF_STOCK";
  if (item.packagesOnHand <= item.reorderThreshold) return "LOW_STOCK";
  return "ACTIVE";
}

export function snapshotItem(item: InventoryItem): ItemSnapshot {
  const unitsOnHand = item.packagesOnHand * item.unitsPerPackage;
  const costPerUnit = n(item.costPerUnit);
  const wholesalePrice = n(item.wholesalePrice);
  const retailPrice = n(item.retailPrice);
  const inventoryValueCost = unitsOnHand * costPerUnit;
  const inventoryValueWholesale = item.packagesOnHand * wholesalePrice;
  const inventoryValueRetail = item.packagesOnHand * retailPrice;

  return {
    id: item.id,
    sku: item.sku,
    productName: item.productName,
    blend: item.blend,
    packagingType: item.packagingType,
    unitsPerPackage: item.unitsPerPackage,
    packagesOnHand: item.packagesOnHand,
    unitsOnHand,
    costPerUnit,
    wholesalePrice,
    retailPrice,
    reorderThreshold: item.reorderThreshold,
    preferredReorderQty: item.preferredReorderQty,
    status: item.status,
    computedStatus: computeStatus(item),
    inventoryValueCost,
    inventoryValueWholesale,
    inventoryValueRetail,
  };
}

/**
 * Velocity & stockout math given recent sales (last N days of packages
 * sold for this SKU). Returns null when there's no sales history yet —
 * caller decides how to render that.
 */
export type Velocity = {
  packagesSoldInWindow: number;
  windowDays: number;
  packagesPerDay: number;
  daysOfStockRemaining: number;
  projectedStockoutDate: string | null;
  recommendReorder: boolean;
} | null;

export function velocity(
  packagesOnHand: number,
  packagesSoldInWindow: number,
  windowDays: number,
  reorderThreshold: number,
): Velocity {
  if (windowDays <= 0) return null;
  const packagesPerDay = packagesSoldInWindow / windowDays;
  if (packagesPerDay <= 0) return null;
  const daysOfStockRemaining = packagesOnHand / packagesPerDay;
  const projected = new Date(
    Date.now() + daysOfStockRemaining * 86400000,
  ).toISOString();
  // Recommend reorder if we'll dip below threshold within the next window
  const projectedAtWindowEnd = packagesOnHand - packagesPerDay * windowDays;
  return {
    packagesSoldInWindow,
    windowDays,
    packagesPerDay,
    daysOfStockRemaining,
    projectedStockoutDate: projected,
    recommendReorder: projectedAtWindowEnd <= reorderThreshold,
  };
}

export type SoldLine = {
  inventoryItemId: string | null;
  quantity: number;
  lineTotal: number;
  customerId: string;
  customerName: string;
  customerType: string;
};

/**
 * Pure aggregation over invoice line items for the snapshot cards.
 * Exported for tests; `loadInventorySnapshot` feeds it live rows.
 */
export function aggregateSoldLines(lines: SoldLine[]) {
  const bySku = new Map<string, { packagesSold: number; revenue: number }>();
  const byCustomer = new Map<
    string,
    { customerId: string; customerName: string; packages: number; revenue: number }
  >();
  const byChannel = new Map<
    string,
    { channel: string; packages: number; revenue: number }
  >();

  for (const l of lines) {
    if (l.inventoryItemId) {
      const cur = bySku.get(l.inventoryItemId) ?? { packagesSold: 0, revenue: 0 };
      cur.packagesSold += l.quantity;
      cur.revenue += l.lineTotal;
      bySku.set(l.inventoryItemId, cur);
    }
    const c = byCustomer.get(l.customerId) ?? {
      customerId: l.customerId,
      customerName: l.customerName,
      packages: 0,
      revenue: 0,
    };
    c.packages += l.quantity;
    c.revenue += l.lineTotal;
    byCustomer.set(l.customerId, c);

    const ch = byChannel.get(l.customerType) ?? {
      channel: l.customerType,
      packages: 0,
      revenue: 0,
    };
    ch.packages += l.quantity;
    ch.revenue += l.lineTotal;
    byChannel.set(l.customerType, ch);
  }

  return {
    bySku,
    salesByCustomer: Array.from(byCustomer.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
    salesByChannel: Array.from(byChannel.values()).sort(
      (a, b) => b.revenue - a.revenue,
    ),
  };
}
