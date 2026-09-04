import { describe, expect, it } from "vitest";
import { planQuickBooksImport, toDate, toNumber } from "./quickbooks";

const HEADER = "Date,No.,Customer,Memo,Due Date,Total,Balance,Status";

function plan(
  rows: string[],
  opts: Partial<Parameters<typeof planQuickBooksImport>[1]> = {},
) {
  const csv = [HEADER, ...rows].join("\n");
  return planQuickBooksImport(csv, {
    customersByName: new Map([["cigar lounge", "c1"]]),
    existingRefs: new Set(),
    createMissingCustomers: false,
    ...opts,
  });
}

function rowsOf(r: ReturnType<typeof planQuickBooksImport>) {
  if (!r.ok) throw new Error(r.error);
  return r.rows;
}

describe("toNumber", () => {
  it("strips currency formatting", () => {
    expect(toNumber("$1,234.50")).toBe(1234.5);
    expect(toNumber("(50.00)")).toBe(50);
  });
  it("treats blanks and dashes as zero", () => {
    expect(toNumber("")).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("—")).toBe(0);
    expect(toNumber("abc")).toBe(0);
  });
});

describe("toDate", () => {
  it("parses US m/d/yy and m/d/yyyy", () => {
    expect(toDate("3/5/26")?.toISOString().slice(0, 10)).toBe("2026-03-05");
    expect(toDate("12/25/2025")?.toISOString().slice(0, 10)).toBe("2025-12-25");
  });
  it("falls back to ISO and rejects garbage", () => {
    expect(toDate("2026-03-05")).not.toBeNull();
    expect(toDate("not a date")).toBeNull();
    expect(toDate(undefined)).toBeNull();
  });
});

describe("planQuickBooksImport", () => {
  it("fails without a usable header row", () => {
    const r = planQuickBooksImport("foo,bar\n1,2", {
      customersByName: new Map(),
      existingRefs: new Set(),
      createMissingCustomers: false,
    });
    expect(r.ok).toBe(false);
  });

  it("finds the header after preamble rows and skips noise rows", () => {
    const csv = [
      "Heaven's Leaf",
      "Invoices, All Dates",
      HEADER,
      "01/10/2026,1001,Cigar Lounge,,02/09/2026,$500.00,$0.00,Paid",
      ",,,,,$500.00,,",
    ].join("\n");
    const rows = rowsOf(
      planQuickBooksImport(csv, {
        customersByName: new Map([["cigar lounge", "c1"]]),
        existingRefs: new Set(),
        createMissingCustomers: false,
      }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      qbNumber: "1001",
      customerName: "Cigar Lounge",
      total: 500,
      status: "PAID",
      amountPaid: 500,
      outcome: "create",
    });
  });

  it("matches customers case-insensitively and flags unknown ones", () => {
    const rows = rowsOf(
      plan([
        "01/10/2026,1,CIGAR LOUNGE,,,$100,$0,Paid",
        "01/11/2026,2,New Shop,,,$100,$0,Paid",
      ]),
    );
    expect(rows[0]!.outcome).toBe("create");
    expect(rows[1]!.outcome).toBe("no-customer");
  });

  it("marks unknown customers as new-customer when auto-create is on", () => {
    const rows = rowsOf(
      plan(
        [
          "01/11/2026,2,New Shop,,,$100,$0,Paid",
          "01/12/2026,3,New Shop,,,$100,$0,Paid",
        ],
        { createMissingCustomers: true },
      ),
    );
    // First row creates the customer; the second sees it as known.
    expect(rows[0]!.outcome).toBe("new-customer");
    expect(rows[1]!.outcome).toBe("create");
  });

  it("skips duplicates from the database and within the same file", () => {
    const rows = rowsOf(
      plan(
        [
          "01/10/2026,1,Cigar Lounge,,,$100,$0,Paid",
          "01/10/2026,1,Cigar Lounge,,,$100,$0,Paid",
          "01/10/2026,9,Cigar Lounge,,,$100,$0,Paid",
        ],
        { existingRefs: new Set(["9"]) },
      ),
    );
    expect(rows.map((r) => r.outcome)).toEqual(["create", "duplicate", "duplicate"]);
  });

  it("reports rows with missing customer, bad date, or zero total as errors", () => {
    const rows = rowsOf(
      plan([
        "01/10/2026,1,,,,$100,$0,Paid",
        "bogus,2,Cigar Lounge,,,$100,$0,Paid",
        "01/10/2026,3,Cigar Lounge,,,$0,$0,Paid",
      ]),
    );
    expect(rows.map((r) => r.problem)).toEqual([
      "Missing customer",
      "Unreadable date",
      "Missing or zero total",
    ]);
    expect(rows.every((r) => r.outcome === "error")).toBe(true);
  });

  describe("status derivation", () => {
    const far = "12/31/2099";
    const past = "01/01/2020";

    it("uses the explicit status column when present", () => {
      const rows = rowsOf(
        plan([
          `01/10/2026,1,Cigar Lounge,,${far},$100,$100,Open`,
          `01/10/2026,2,Cigar Lounge,,${past},$100,$100,Open`,
          `01/10/2026,3,Cigar Lounge,,${far},$100,$40,Partially paid`,
          `01/10/2026,4,Cigar Lounge,,${far},$100,$100,Overdue`,
          `01/10/2026,5,Cigar Lounge,,${far},$100,$0,Voided`,
          `01/10/2026,6,Cigar Lounge,,${far},$100,$0,Deposited`,
        ]),
      );
      expect(rows.map((r) => [r.status, r.amountPaid])).toEqual([
        ["SENT", 0],
        ["OVERDUE", 0],
        ["PARTIAL", 60],
        ["OVERDUE", 0],
        ["CANCELLED", 0],
        ["PAID", 100],
      ]);
    });

    it("falls back to the balance column when status is blank", () => {
      const rows = rowsOf(
        plan([
          `01/10/2026,1,Cigar Lounge,,${far},$100,$0,`,
          `01/10/2026,2,Cigar Lounge,,${far},$100,$100,`,
          `01/10/2026,3,Cigar Lounge,,${past},$100,$100,`,
          `01/10/2026,4,Cigar Lounge,,${far},$100,$25,`,
        ]),
      );
      expect(rows.map((r) => [r.status, r.amountPaid])).toEqual([
        ["PAID", 100],
        ["SENT", 0],
        ["OVERDUE", 0],
        ["PARTIAL", 75],
      ]);
    });

    it("assumes paid when neither status nor balance exists", () => {
      const csv = ["Date,Customer,Total", "01/10/2026,Cigar Lounge,$80"].join("\n");
      const rows = rowsOf(
        planQuickBooksImport(csv, {
          customersByName: new Map([["cigar lounge", "c1"]]),
          existingRefs: new Set(),
          createMissingCustomers: false,
        }),
      );
      expect(rows[0]).toMatchObject({ status: "PAID", amountPaid: 80, qbNumber: null });
    });
  });
});
