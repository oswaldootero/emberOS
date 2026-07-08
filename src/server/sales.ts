import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, SaleStatus } from "@prisma/client";

export function n(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (v && typeof v === "object" && "toString" in v) return Number(v.toString());
  return 0;
}

// ─────────────────────────────────────────────────────────────────
// Totals math — single source of truth, mirrored client-side in the
// sale form for live preview. Line: qty * price * (1 - disc%) then
// tax% on the discounted amount. Order-level discount/shipping apply
// after the line rollup.
// ─────────────────────────────────────────────────────────────────

export type LineInput = {
  product: string;
  inventoryItemId?: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number; // 0–100
  taxPct: number;      // 0–100
};

export type ComputedTotals = {
  subtotal: number;       // sum of qty*price before discounts/tax
  lineDiscounts: number;  // discount portion from line items
  discountTotal: number;  // lineDiscounts + orderDiscount
  taxTotal: number;
  shipping: number;
  grandTotal: number;
  lines: (LineInput & { lineTotal: number })[];
};

const r2 = (v: number) => Math.round(v * 100) / 100;

export function computeTotals(
  items: LineInput[],
  orderDiscount = 0,
  shipping = 0,
): ComputedTotals {
  let subtotal = 0;
  let lineDiscounts = 0;
  let taxTotal = 0;

  const lines = items.map((it) => {
    const gross = it.quantity * it.unitPrice;
    const discount = gross * (it.discountPct / 100);
    const discounted = gross - discount;
    const tax = discounted * (it.taxPct / 100);
    subtotal += gross;
    lineDiscounts += discount;
    taxTotal += tax;
    return { ...it, lineTotal: r2(discounted + tax) };
  });

  const discountTotal = lineDiscounts + orderDiscount;
  const grandTotal = subtotal - discountTotal + taxTotal + shipping;

  return {
    subtotal: r2(subtotal),
    lineDiscounts: r2(lineDiscounts),
    discountTotal: r2(discountTotal),
    taxTotal: r2(taxTotal),
    shipping: r2(shipping),
    grandTotal: r2(Math.max(0, grandTotal)),
    lines,
  };
}

// ─────────────────────────────────────────────────────────────────
// Invoice numbers — INV-<year>-<zero-padded seq>, unique per year.
// Race-safe via unique constraint + retry in the caller.
// ─────────────────────────────────────────────────────────────────

export async function nextInvoiceNumber(
  base: "INV" | "REC" = "INV",
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${base}-${year}-`;
  const last = await prisma.sale.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const lastSeq = last ? Number(last.invoiceNumber.slice(prefix.length)) : 0;
  return `${prefix}${String(lastSeq + 1).padStart(5, "0")}`;
}

// ─────────────────────────────────────────────────────────────────
// List loading — server-side filter/sort/pagination. Designed for
// tens of thousands of rows: everything happens in SQL, page size 25.
// ─────────────────────────────────────────────────────────────────

export const SALES_PAGE_SIZE = 25;

export type SalesListParams = {
  q?: string;               // invoice # or customer name
  status?: SaleStatus | "";
  customerId?: string;
  sort?: "invoiceDate" | "dueDate" | "grandTotal" | "invoiceNumber" | "status";
  dir?: "asc" | "desc";
  page?: number;            // 1-based
};

export async function loadSalesList(params: SalesListParams) {
  const page = Math.max(1, params.page ?? 1);
  const sort = params.sort ?? "invoiceDate";
  const dir = params.dir ?? "desc";

  const where: Prisma.SaleWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.customerId ? { customerId: params.customerId } : {}),
    ...(params.q
      ? {
          OR: [
            { invoiceNumber: { contains: params.q, mode: "insensitive" } },
            {
              customer: {
                businessName: { contains: params.q, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total, statusAgg, outstandingAgg] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { [sort]: dir },
      skip: (page - 1) * SALES_PAGE_SIZE,
      take: SALES_PAGE_SIZE,
      include: {
        customer: { select: { id: true, businessName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.sale.count({ where }),
    prisma.sale.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { grandTotal: true },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true, amountPaid: true },
      where: { status: { in: ["SENT", "PARTIAL", "OVERDUE"] } },
    }),
  ]);

  return {
    rows: rows.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      customerId: s.customer.id,
      customerName: s.customer.businessName,
      invoiceDate: s.invoiceDate.toISOString(),
      dueDate: s.dueDate?.toISOString() ?? null,
      status: s.status,
      source: s.source,
      externalRef: s.externalRef,
      grandTotal: n(s.grandTotal),
      amountPaid: n(s.amountPaid),
      itemCount: s._count.items,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / SALES_PAGE_SIZE)),
    statusCounts: Object.fromEntries(
      statusAgg.map((s) => [s.status, s._count._all]),
    ) as Record<string, number>,
    outstandingTotal:
      n(outstandingAgg._sum.grandTotal) - n(outstandingAgg._sum.amountPaid),
  };
}

export async function loadSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { fullName: true, email: true } },
    },
  });
  if (!sale) return null;
  return sale;
}

/**
 * Mark overdue in bulk: any SENT/PARTIAL invoice past its due date.
 * Called opportunistically from list/detail loads — cheap update.
 */
export async function sweepOverdue(): Promise<void> {
  await prisma.sale.updateMany({
    where: {
      status: { in: ["SENT", "PARTIAL"] },
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });
}
