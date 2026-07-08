import Papa from "papaparse";

/**
 * Pure QuickBooks-CSV planning logic — no auth, no database. Parses the
 * export, maps loose header names, derives payment status, and decides
 * per-row outcomes against the provided existing state. The server
 * action feeds it current customers/refs and then executes the plan.
 */

export type QBPlannedRow = {
  line: number;
  qbNumber: string | null;
  customerName: string;
  date: string; // yyyy-mm-dd
  dateObj: Date;
  dueDate: Date | null;
  memo: string | null;
  total: number;
  status: "PAID" | "SENT" | "PARTIAL" | "OVERDUE" | "CANCELLED";
  amountPaid: number;
  outcome: "create" | "duplicate" | "new-customer" | "no-customer" | "error";
  problem?: string;
};

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "invoice date", "txn date", "transaction date", "create date"],
  number: ["no.", "no", "num", "number", "invoice no", "invoice no.", "invoice number", "doc number", "doc no"],
  customer: ["customer", "customer name", "name", "customer full name", "client"],
  total: ["total", "amount", "total amount", "invoice amount"],
  balance: ["balance", "open balance", "balance due", "amount due"],
  status: ["status", "invoice status", "paid status"],
  dueDate: ["due date"],
  memo: ["memo", "memo/description", "description", "message"],
};

export function toNumber(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[$,%"()\s]/g, "").trim();
  if (!cleaned || cleaned === "—" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return isNaN(n) ? 0 : Math.abs(n);
}

export function toDate(v: string | undefined): Date | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [m, d, y] = s.split("/");
    const year = y!.length === 2 ? `20${y}` : y;
    const date = new Date(
      `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}T12:00:00`,
    );
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(s);
  return isNaN(date.getTime()) ? null : date;
}

function mapColumns(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  const lower = header.map((h) => h.toLowerCase().trim());
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias);
      if (idx !== -1) {
        map.set(key, idx);
        break;
      }
    }
  }
  return map;
}

export function planQuickBooksImport(
  raw: string,
  state: {
    /** lowercase business name → customer id */
    customersByName: Map<string, string>;
    /** lowercase externalRefs already imported */
    existingRefs: Set<string>;
    createMissingCustomers: boolean;
  },
): { ok: true; rows: QBPlannedRow[] } | { ok: false; error: string } {
  const parsed = Papa.parse<string[]>(raw, { skipEmptyLines: true });
  const grid = parsed.data.filter((r) => r.some((c) => c?.trim()));
  if (grid.length < 2) return { ok: false, error: "No data rows found in the CSV." };

  let headerIdx = -1;
  let cols = new Map<string, number>();
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const candidate = mapColumns(grid[i]!);
    if (candidate.has("date") && candidate.has("customer") && candidate.has("total")) {
      headerIdx = i;
      cols = candidate;
      break;
    }
  }
  if (headerIdx === -1) {
    return {
      ok: false,
      error:
        "Couldn't find the header row. The CSV needs at least Date, Customer, and Total/Amount columns (QuickBooks → Sales → Invoices → Export).",
    };
  }

  const cell = (row: string[], key: string): string | undefined => {
    const idx = cols.get(key);
    return idx === undefined ? undefined : row[idx]?.trim();
  };

  // Copies so planning doesn't mutate caller state
  const knownCustomers = new Map(state.customersByName);
  const seenRefs = new Set(state.existingRefs);

  const rows: QBPlannedRow[] = [];
  const dataRows = grid.slice(headerIdx + 1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;
    const line = headerIdx + i + 2;
    const customerName = cell(row, "customer") ?? "";
    const qbNumber = cell(row, "number") || null;
    const dateObj = toDate(cell(row, "date"));
    const total = toNumber(cell(row, "total"));
    const balance = cols.has("balance") ? toNumber(cell(row, "balance")) : null;
    const statusRaw = (cell(row, "status") ?? "").toLowerCase();
    const dueDate = toDate(cell(row, "dueDate"));
    const memo = cell(row, "memo") || null;

    // Skip non-invoice noise rows (grand totals etc.)
    if (!customerName && !qbNumber) continue;

    const base = {
      line,
      qbNumber,
      customerName,
      date: (dateObj ?? new Date(0)).toISOString().slice(0, 10),
      dateObj: dateObj ?? new Date(0),
      dueDate,
      memo,
      total,
      status: "PAID" as QBPlannedRow["status"],
      amountPaid: total,
    };

    if (!customerName || !dateObj || total <= 0) {
      rows.push({
        ...base,
        outcome: "error",
        problem: !customerName
          ? "Missing customer"
          : !dateObj
            ? "Unreadable date"
            : "Missing or zero total",
      });
      continue;
    }

    // Derive status: explicit column wins, then balance
    let status: QBPlannedRow["status"] = "PAID";
    let amountPaid = total;
    const pastDue = dueDate !== null && dueDate < new Date();
    if (statusRaw.includes("void")) {
      status = "CANCELLED";
      amountPaid = 0;
    } else if (statusRaw.includes("partial")) {
      status = "PARTIAL";
      amountPaid = balance !== null ? Math.max(0, total - balance) : 0;
    } else if (statusRaw.includes("overdue")) {
      status = "OVERDUE";
      amountPaid = balance !== null ? Math.max(0, total - balance) : 0;
    } else if (
      statusRaw.includes("open") ||
      statusRaw.includes("sent") ||
      statusRaw.includes("unpaid")
    ) {
      status = pastDue ? "OVERDUE" : "SENT";
      amountPaid = balance !== null ? Math.max(0, total - balance) : 0;
    } else if (statusRaw.includes("paid") || statusRaw.includes("deposit")) {
      status = "PAID";
      amountPaid = total;
    } else if (balance !== null) {
      if (balance <= 0) {
        status = "PAID";
        amountPaid = total;
      } else if (balance >= total) {
        status = pastDue ? "OVERDUE" : "SENT";
        amountPaid = 0;
      } else {
        status = "PARTIAL";
        amountPaid = total - balance;
      }
    }
    base.status = status;
    base.amountPaid = Math.round(amountPaid * 100) / 100;

    if (qbNumber && seenRefs.has(qbNumber.toLowerCase())) {
      rows.push({ ...base, outcome: "duplicate" });
      continue;
    }

    const key = customerName.toLowerCase().trim();
    const known = knownCustomers.has(key);
    if (!known && !state.createMissingCustomers) {
      rows.push({
        ...base,
        outcome: "no-customer",
        problem:
          "No matching customer — enable “create missing customers” or add them first",
      });
      continue;
    }

    rows.push({ ...base, outcome: known ? "create" : "new-customer" });
    if (!known) knownCustomers.set(key, "pending");
    if (qbNumber) seenRefs.add(qbNumber.toLowerCase());
  }

  return { ok: true, rows };
}
