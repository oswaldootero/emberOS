import { describe, expect, it } from "vitest";
import { aggregateSoldLines } from "./calculator";

const line = (
  inventoryItemId: string | null,
  quantity: number,
  lineTotal: number,
  customerId = "c1",
  customerType = "RETAILER",
) => ({
  inventoryItemId,
  quantity,
  lineTotal,
  customerId,
  customerName: `Name ${customerId}`,
  customerType,
});

describe("aggregateSoldLines", () => {
  it("sums packages and revenue per SKU, skipping custom lines", () => {
    const { bySku } = aggregateSoldLines([
      line("sku1", 2, 100),
      line("sku1", 3, 150),
      line(null, 1, 999),
    ]);
    expect(bySku.get("sku1")).toEqual({ packagesSold: 5, revenue: 250 });
    expect(bySku.size).toBe(1);
  });

  it("ranks customers by revenue and keeps the top six", () => {
    const lines = Array.from({ length: 8 }, (_, i) =>
      line("sku1", 1, (i + 1) * 10, `c${i}`),
    );
    const { salesByCustomer } = aggregateSoldLines(lines);
    expect(salesByCustomer).toHaveLength(6);
    expect(salesByCustomer[0]).toMatchObject({ customerId: "c7", revenue: 80 });
  });

  it("folds revenue by customer type, including custom lines", () => {
    const { salesByChannel } = aggregateSoldLines([
      line("sku1", 1, 50, "c1", "RETAILER"),
      line(null, 2, 70, "c2", "LOUNGE"),
      line("sku2", 1, 30, "c3", "RETAILER"),
    ]);
    expect(salesByChannel).toEqual([
      { channel: "RETAILER", packages: 2, revenue: 80 },
      { channel: "LOUNGE", packages: 2, revenue: 70 },
    ]);
  });
});
