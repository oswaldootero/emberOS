import { describe, expect, it } from "vitest";
import { predictReorders } from "./predict-reorders";

const NOW = new Date("2026-09-04T12:00:00Z");
const day = (offset: number) => new Date(NOW.getTime() + offset * 86400000);

function sale(customerId: string, daysAgo: number, total = 100) {
  return {
    customerId,
    customerName: `Customer ${customerId}`,
    invoiceDate: day(-daysAgo),
    grandTotal: total,
  };
}

describe("predictReorders", () => {
  it("ignores customers with fewer than two invoices", () => {
    expect(predictReorders([sale("a", 10)], NOW)).toEqual([]);
  });

  it("predicts from the average gap between invoices", () => {
    // Orders 60, 30, and 0 days before the last one → every 30 days.
    const out = predictReorders(
      [sale("a", 80), sale("a", 50), sale("a", 20, 250)],
      NOW,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      customerId: "a",
      avgDaysBetween: 30,
      daysUntil: 10,
      lastTotal: 250,
    });
  });

  it("drops predictions outside the horizon or too far overdue", () => {
    const tooFar = [sale("far", 100), sale("far", 0)]; // every 100d → in 100d
    const stale = [sale("stale", 200, 1), sale("stale", 190)]; // every 10d, 180d overdue
    const soon = [sale("soon", 40), sale("soon", 20)]; // every 20d → due now
    const out = predictReorders([...tooFar, ...stale, ...soon], NOW);
    expect(out.map((r) => r.customerId)).toEqual(["soon"]);
    expect(out[0]!.daysUntil).toBe(0);
  });

  it("sorts soonest first and respects the limit", () => {
    const out = predictReorders(
      [
        sale("late", 30), sale("late", 5), // every 25d → in 20d
        sale("overdue", 30), sale("overdue", 20), // every 10d → 10d overdue
        sale("mid", 30), sale("mid", 10), // every 20d → in 10d
      ],
      NOW,
      2,
    );
    expect(out.map((r) => r.customerId)).toEqual(["overdue", "mid"]);
    expect(out[0]!.daysUntil).toBe(-10);
  });

  it("handles same-day invoices without dividing by zero", () => {
    expect(predictReorders([sale("a", 5), sale("a", 5)], NOW)).toEqual([]);
  });
});
