"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { computeTotals, nextInvoiceNumber } from "@/server/sales";

export type SaleActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const LineSchema = z.object({
  product: z.string().min(1).max(200),
  inventoryItemId: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  discountPct: z.number().min(0).max(100).default(0),
  taxPct: z.number().min(0).max(100).default(0),
});

const SaleSchema = z.object({
  customerId: z.string().min(1),
  invoiceDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z
    .enum(["DRAFT", "SENT", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"])
    .default("DRAFT"),
  items: z.array(LineSchema).min(1, "At least one line item is required"),
  orderDiscount: z.number().nonnegative().default(0),
  shipping: z.number().nonnegative().default(0),
  amountPaid: z.number().nonnegative().default(0),
  notes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
});

function firstError(e: z.ZodError): string {
  const f = e.errors[0];
  return f ? `${f.path.join(".")}: ${f.message}` : "Invalid input";
}

function revalidateSale(customerId: string) {
  revalidatePath("/sales");
  revalidatePath("/crm");
  revalidatePath(`/crm/${customerId}`);
  revalidatePath("/crm/analytics");
}

// ─────────────────────────────────────────────────────────────────
// createSale
// ─────────────────────────────────────────────────────────────────

export async function createSale(input: unknown): Promise<SaleActionResult> {
  const user = await requireUser();
  const parsed = SaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const totals = computeTotals(d.items, d.orderDiscount, d.shipping);

  // Retry once on invoice-number collision (two users creating at once)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const sale = await prisma.sale.create({
        data: {
          invoiceNumber: await nextInvoiceNumber(),
          customerId: d.customerId,
          invoiceDate: d.invoiceDate ? new Date(d.invoiceDate) : new Date(),
          dueDate: d.dueDate ? new Date(d.dueDate) : null,
          status: d.status,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          shipping: totals.shipping,
          grandTotal: totals.grandTotal,
          amountPaid: d.status === "PAID" ? totals.grandTotal : d.amountPaid,
          paidAt: d.status === "PAID" ? new Date() : null,
          notes: d.notes || null,
          internalNotes: d.internalNotes || null,
          createdById: user.id,
          items: {
            create: totals.lines.map((l, i) => ({
              product: l.product,
              inventoryItemId: l.inventoryItemId || null,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPct: l.discountPct,
              taxPct: l.taxPct,
              lineTotal: l.lineTotal,
              sortOrder: i,
            })),
          },
        },
      });

      await prisma.customer.update({
        where: { id: d.customerId },
        data: { lastContactDate: new Date() },
      });

      await audit("sales.created", {
        actorId: user.id,
        entityType: "Sale",
        entityId: sale.id,
        diff: { invoiceNumber: sale.invoiceNumber, grandTotal: totals.grandTotal },
      });

      revalidateSale(d.customerId);
      return { ok: true, id: sale.id };
    } catch (e) {
      const isCollision =
        e instanceof Error && e.message.includes("Unique constraint");
      if (!isCollision || attempt === 1) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Create failed",
        };
      }
    }
  }
  return { ok: false, error: "Could not allocate an invoice number." };
}

// ─────────────────────────────────────────────────────────────────
// recordSale — quick capture of a sale that was invoiced elsewhere
// (QuickBooks etc.). One summary line item; no EmberOS invoice flow.
// ─────────────────────────────────────────────────────────────────

const RecordSaleSchema = z.object({
  customerId: z.string().min(1),
  saleDate: z.string().optional().nullable(),
  total: z.number().positive(),
  status: z.enum(["PAID", "SENT", "PARTIAL", "OVERDUE"]).default("PAID"),
  amountPaid: z.number().nonnegative().optional(),
  externalRef: z.string().max(60).optional().nullable(), // QuickBooks invoice #
  description: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function recordSale(input: unknown): Promise<SaleActionResult> {
  const user = await requireUser();
  const parsed = RecordSaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const date = d.saleDate ? new Date(d.saleDate) : new Date();
  const amountPaid =
    d.status === "PAID"
      ? d.total
      : d.status === "PARTIAL"
        ? Math.min(d.amountPaid ?? 0, d.total)
        : 0;
  const product =
    d.description ||
    (d.externalRef ? `QuickBooks invoice ${d.externalRef}` : "Recorded sale");

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const sale = await prisma.sale.create({
        data: {
          invoiceNumber: await nextInvoiceNumber("REC"),
          customerId: d.customerId,
          invoiceDate: date,
          status: d.status,
          source: d.externalRef ? "QUICKBOOKS" : "EXTERNAL",
          externalRef: d.externalRef || null,
          subtotal: d.total,
          discountTotal: 0,
          taxTotal: 0,
          shipping: 0,
          grandTotal: d.total,
          amountPaid,
          paidAt: d.status === "PAID" ? date : null,
          notes: d.notes || null,
          createdById: user.id,
          items: {
            create: [
              {
                product,
                quantity: 1,
                unitPrice: d.total,
                discountPct: 0,
                taxPct: 0,
                lineTotal: d.total,
                sortOrder: 0,
              },
            ],
          },
        },
      });
      await prisma.customer.update({
        where: { id: d.customerId },
        data: { lastContactDate: date },
      });
      await audit("sales.recorded", {
        actorId: user.id,
        entityType: "Sale",
        entityId: sale.id,
        diff: { total: d.total, externalRef: d.externalRef ?? null },
      });
      revalidateSale(d.customerId);
      return { ok: true, id: sale.id };
    } catch (e) {
      const isCollision =
        e instanceof Error && e.message.includes("Unique constraint");
      if (!isCollision || attempt === 1) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : "Record failed",
        };
      }
    }
  }
  return { ok: false, error: "Could not allocate a record number." };
}

// ─────────────────────────────────────────────────────────────────
// updateSale — full replace of fields + line items, totals recomputed
// ─────────────────────────────────────────────────────────────────

export async function updateSale(
  id: string,
  input: unknown,
): Promise<SaleActionResult> {
  const user = await requireUser();
  const parsed = SaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Invoice not found." };
  if (existing.status === "CANCELLED") {
    return { ok: false, error: "Voided invoices can't be edited." };
  }

  const totals = computeTotals(d.items, d.orderDiscount, d.shipping);

  await prisma.$transaction([
    prisma.saleItem.deleteMany({ where: { saleId: id } }),
    prisma.sale.update({
      where: { id },
      data: {
        customerId: d.customerId,
        invoiceDate: d.invoiceDate ? new Date(d.invoiceDate) : undefined,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        status: d.status,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        taxTotal: totals.taxTotal,
        shipping: totals.shipping,
        grandTotal: totals.grandTotal,
        amountPaid: d.status === "PAID" ? totals.grandTotal : d.amountPaid,
        paidAt:
          d.status === "PAID" ? (existing.paidAt ?? new Date()) : null,
        notes: d.notes || null,
        internalNotes: d.internalNotes || null,
        items: {
          create: totals.lines.map((l, i) => ({
            product: l.product,
            inventoryItemId: l.inventoryItemId || null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            taxPct: l.taxPct,
            lineTotal: l.lineTotal,
            sortOrder: i,
          })),
        },
      },
    }),
  ]);

  await audit("sales.updated", {
    actorId: user.id,
    entityType: "Sale",
    entityId: id,
    diff: { grandTotal: totals.grandTotal, status: d.status },
  });

  revalidateSale(d.customerId);
  revalidatePath(`/sales/${id}`);
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// Status transitions
// ─────────────────────────────────────────────────────────────────

export async function markSalePaid(id: string): Promise<SaleActionResult> {
  const user = await requireUser();
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return { ok: false, error: "Invoice not found." };
  if (sale.status === "CANCELLED") {
    return { ok: false, error: "Voided invoices can't be marked paid." };
  }
  await prisma.sale.update({
    where: { id },
    data: { status: "PAID", amountPaid: sale.grandTotal, paidAt: new Date() },
  });
  await audit("sales.marked_paid", {
    actorId: user.id,
    entityType: "Sale",
    entityId: id,
  });
  revalidateSale(sale.customerId);
  revalidatePath(`/sales/${id}`);
  return { ok: true, id };
}

export async function recordPayment(
  id: string,
  amount: number,
): Promise<SaleActionResult> {
  const user = await requireUser();
  if (!(amount > 0)) return { ok: false, error: "Amount must be positive." };
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return { ok: false, error: "Invoice not found." };
  if (sale.status === "CANCELLED" || sale.status === "PAID") {
    return { ok: false, error: `Invoice is ${sale.status.toLowerCase()}.` };
  }
  const paid = Number(sale.amountPaid.toString()) + amount;
  const total = Number(sale.grandTotal.toString());
  const fullyPaid = paid >= total - 0.005;

  await prisma.sale.update({
    where: { id },
    data: {
      amountPaid: fullyPaid ? total : paid,
      status: fullyPaid ? "PAID" : "PARTIAL",
      paidAt: fullyPaid ? new Date() : null,
    },
  });
  await audit("sales.payment_recorded", {
    actorId: user.id,
    entityType: "Sale",
    entityId: id,
    diff: { amount },
  });
  revalidateSale(sale.customerId);
  revalidatePath(`/sales/${id}`);
  return { ok: true, id };
}

export async function setSaleStatus(
  id: string,
  status: "DRAFT" | "SENT" | "CANCELLED",
): Promise<SaleActionResult> {
  const user = await requireUser();
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return { ok: false, error: "Invoice not found." };
  await prisma.sale.update({ where: { id }, data: { status } });
  await audit(
    status === "CANCELLED" ? "sales.voided" : "sales.status_changed",
    { actorId: user.id, entityType: "Sale", entityId: id, diff: { status } },
  );
  revalidateSale(sale.customerId);
  revalidatePath(`/sales/${id}`);
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// duplicateSale — copy items into a fresh DRAFT with a new number
// ─────────────────────────────────────────────────────────────────

export async function duplicateSale(id: string): Promise<SaleActionResult> {
  const user = await requireUser();
  const src = await prisma.sale.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!src) return { ok: false, error: "Invoice not found." };

  const copy = await prisma.sale.create({
    data: {
      invoiceNumber: await nextInvoiceNumber(),
      customerId: src.customerId,
      invoiceDate: new Date(),
      dueDate: null,
      status: "DRAFT",
      subtotal: src.subtotal,
      discountTotal: src.discountTotal,
      taxTotal: src.taxTotal,
      shipping: src.shipping,
      grandTotal: src.grandTotal,
      amountPaid: 0,
      notes: src.notes,
      internalNotes: src.internalNotes,
      createdById: user.id,
      items: {
        create: src.items.map((it, i) => ({
          product: it.product,
          inventoryItemId: it.inventoryItemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          taxPct: it.taxPct,
          lineTotal: it.lineTotal,
          sortOrder: i,
        })),
      },
    },
  });

  await audit("sales.duplicated", {
    actorId: user.id,
    entityType: "Sale",
    entityId: copy.id,
    diff: { from: id },
  });
  revalidateSale(src.customerId);
  return { ok: true, id: copy.id };
}

// ─────────────────────────────────────────────────────────────────
// Bulk operations
// ─────────────────────────────────────────────────────────────────

export async function bulkVoidSales(ids: string[]): Promise<SaleActionResult> {
  const user = await requireUser();
  if (!ids.length) return { ok: false, error: "Nothing selected." };
  const r = await prisma.sale.updateMany({
    where: { id: { in: ids }, status: { not: "CANCELLED" } },
    data: { status: "CANCELLED" },
  });
  await audit("sales.bulk_voided", {
    actorId: user.id,
    entityType: "Sale",
    diff: { count: r.count, ids },
  });
  revalidatePath("/sales");
  revalidatePath("/crm");
  return { ok: true, id: String(r.count) };
}

/** Hard delete — admin only. Removes the invoices and their line items. */
export async function bulkDeleteSales(ids: string[]): Promise<SaleActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin only." };
  if (!ids.length) return { ok: false, error: "Nothing selected." };
  const r = await prisma.sale.deleteMany({ where: { id: { in: ids } } });
  await audit("sales.bulk_deleted", {
    actorId: user.id,
    entityType: "Sale",
    diff: { count: r.count, ids },
  });
  revalidatePath("/sales");
  revalidatePath("/crm");
  return { ok: true, id: String(r.count) };
}

// ─────────────────────────────────────────────────────────────────
// deleteSale — admins only, and only drafts. Everything else is void.
// ─────────────────────────────────────────────────────────────────

export async function deleteSale(id: string): Promise<SaleActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin only." };
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return { ok: false, error: "Invoice not found." };
  if (sale.status !== "DRAFT") {
    return { ok: false, error: "Only drafts can be deleted — void instead." };
  }
  await prisma.sale.delete({ where: { id } });
  await audit("sales.deleted", {
    actorId: user.id,
    entityType: "Sale",
    entityId: id,
  });
  revalidateSale(sale.customerId);
  return { ok: true, id };
}
