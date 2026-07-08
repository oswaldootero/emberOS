"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  planQuickBooksImport,
  type QBPlannedRow,
} from "@/server/sales/quickbooks";

/**
 * QuickBooks invoice CSV import. Parsing/planning is pure (see
 * src/server/sales/quickbooks.ts); this action supplies current state,
 * shows a dry-run preview, and executes the plan. Rows whose QB number
 * was already imported are skipped, so re-importing a file is safe.
 */

export type QBRowPreview = Pick<
  QBPlannedRow,
  "line" | "qbNumber" | "customerName" | "date" | "total" | "status" | "amountPaid" | "outcome" | "problem"
>;

export type QBImportResult =
  | {
      ok: true;
      dryRun: boolean;
      rows: QBRowPreview[];
      created: number;
      customersCreated: number;
      skippedDuplicates: number;
      skippedNoCustomer: number;
      errors: number;
    }
  | { ok: false; error: string };

export async function importQuickBooksCsv(
  raw: string,
  opts: { dryRun: boolean; createMissingCustomers: boolean },
): Promise<QBImportResult> {
  const user = await requireUser();

  if (!raw?.trim()) return { ok: false, error: "The file is empty." };
  if (raw.length > 5_000_000) {
    return { ok: false, error: "File too large — split the export by date range." };
  }

  const [allCustomers, existingRefRows] = await Promise.all([
    prisma.customer.findMany({ select: { id: true, businessName: true } }),
    prisma.sale.findMany({
      where: { externalRef: { not: null } },
      select: { externalRef: true },
    }),
  ]);

  const customersByName = new Map(
    allCustomers.map((c) => [c.businessName.toLowerCase().trim(), c.id]),
  );
  const plan = planQuickBooksImport(raw, {
    customersByName,
    existingRefs: new Set(existingRefRows.map((s) => s.externalRef!.toLowerCase())),
    createMissingCustomers: opts.createMissingCustomers,
  });
  if (!plan.ok) return plan;

  let created = 0;
  let customersCreated = 0;
  const rows: QBRowPreview[] = [];

  for (const r of plan.rows) {
    if (opts.dryRun || (r.outcome !== "create" && r.outcome !== "new-customer")) {
      rows.push(r);
      if (r.outcome === "create" || r.outcome === "new-customer") {
        created++;
        if (r.outcome === "new-customer") customersCreated++;
      }
      continue;
    }

    try {
      let customerId = customersByName.get(r.customerName.toLowerCase().trim());
      if (!customerId) {
        const c = await prisma.customer.create({
          data: {
            businessName: r.customerName,
            customerType: "RETAILER",
            status: "ACTIVE_CUSTOMER",
            country: "USA",
            notes: "Created automatically from QuickBooks import.",
          },
        });
        customerId = c.id;
        customersByName.set(r.customerName.toLowerCase().trim(), c.id);
        customersCreated++;
      }

      await prisma.sale.create({
        data: {
          invoiceNumber: r.qbNumber
            ? `QB-${r.qbNumber}`
            : `QB-${r.dateObj.getFullYear()}-L${r.line}`,
          customerId,
          invoiceDate: r.dateObj,
          dueDate: r.dueDate,
          status: r.status,
          source: "QUICKBOOKS",
          externalRef: r.qbNumber,
          subtotal: r.total,
          discountTotal: 0,
          taxTotal: 0,
          shipping: 0,
          grandTotal: r.total,
          amountPaid: r.amountPaid,
          paidAt: r.status === "PAID" ? r.dateObj : null,
          notes: r.memo,
          createdById: user.id,
          items: {
            create: [
              {
                product: r.memo || `QuickBooks invoice ${r.qbNumber ?? ""}`.trim(),
                quantity: 1,
                unitPrice: r.total,
                discountPct: 0,
                taxPct: 0,
                lineTotal: r.total,
                sortOrder: 0,
              },
            ],
          },
        },
      });
      rows.push(r);
      created++;
    } catch (e) {
      rows.push({
        ...r,
        outcome: "error",
        problem: e instanceof Error ? e.message.slice(0, 160) : "Write failed",
      });
    }
  }

  const skippedDuplicates = rows.filter((r) => r.outcome === "duplicate").length;
  const skippedNoCustomer = rows.filter((r) => r.outcome === "no-customer").length;
  const errors = rows.filter((r) => r.outcome === "error").length;

  if (!opts.dryRun) {
    await audit("sales.quickbooks_imported", {
      actorId: user.id,
      entityType: "Sale",
      diff: { created, customersCreated, skippedDuplicates, skippedNoCustomer, errors },
    });
    revalidatePath("/sales");
    revalidatePath("/crm");
    revalidatePath("/crm/analytics");
  }

  return {
    ok: true,
    dryRun: opts.dryRun,
    rows,
    created,
    customersCreated,
    skippedDuplicates,
    skippedNoCustomer,
    errors,
  };
}
