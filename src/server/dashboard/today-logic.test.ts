import { describe, expect, it } from "vitest";
import {
  monthBuckets,
  percentChange,
  pickFeaturedHashtag,
  sortActions,
  urgencyFor,
  type ActionItem,
} from "./today-logic";

const NOW = new Date(2026, 8, 5, 10, 0, 0); // Sep 5 2026 10:00 local

describe("urgencyFor", () => {
  it("classifies by local day boundaries", () => {
    expect(urgencyFor(null, NOW)).toBe("info");
    expect(urgencyFor(new Date(2026, 8, 4, 23, 59), NOW)).toBe("overdue");
    expect(urgencyFor(new Date(2026, 8, 5, 0, 0), NOW)).toBe("today");
    expect(urgencyFor(new Date(2026, 8, 5, 23, 0), NOW)).toBe("today");
    expect(urgencyFor(new Date(2026, 8, 7, 9, 0), NOW)).toBe("soon");
    expect(urgencyFor(new Date(2026, 8, 20), NOW)).toBe("info");
  });
});

describe("sortActions", () => {
  const item = (id: string, urgency: ActionItem["urgency"], due: string | null, title = id): ActionItem => ({
    id, kind: "task", title, detail: null, href: "/", due, urgency,
  });
  it("orders overdue → today → soon → info, then by due date, then title", () => {
    const out = sortActions([
      item("b-info", "info", null, "Zeta"),
      item("a-info", "info", null, "Alpha"),
      item("soon2", "soon", "2026-09-08"),
      item("soon1", "soon", "2026-09-07"),
      item("today", "today", "2026-09-05"),
      item("overdue", "overdue", "2026-09-01"),
    ]);
    expect(out.map((i) => i.id)).toEqual(["overdue", "today", "soon1", "soon2", "a-info", "b-info"]);
  });
});

describe("pickFeaturedHashtag", () => {
  it("prefers a niche or medium monitoring tag over a loud one", () => {
    const pick = pickFeaturedHashtag([
      { tag: "cigarlife", why: "", use: "both", volume: "high" },
      { tag: "botl", why: "", use: "monitor", volume: "niche" },
      { tag: "cigarlounge", why: "", use: "monitor", volume: "medium" },
    ]);
    expect(pick?.tag).toBe("botl");
  });
  it("falls back to any tag when nothing is flagged for monitoring", () => {
    expect(pickFeaturedHashtag([{ tag: "x", why: "", use: "post", volume: "high" }])?.tag).toBe("x");
    expect(pickFeaturedHashtag([])).toBeNull();
  });
});

describe("monthBuckets / percentChange", () => {
  it("builds the trailing months ending now", () => {
    const b = monthBuckets(NOW, 3);
    expect(b.map((x) => x.key)).toEqual(["2026-07", "2026-08", "2026-09"]);
    expect(b[2]!.label).toBe("Sep");
  });
  it("handles year rollover", () => {
    expect(monthBuckets(new Date(2026, 0, 15), 2).map((x) => x.key)).toEqual(["2025-12", "2026-01"]);
  });
  it("computes percent change and guards zero", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(50, 0)).toBeNull();
  });
});
