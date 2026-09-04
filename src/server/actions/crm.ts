"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";

// ─────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────

const CustomerSchema = z.object({
  businessName: z.string().min(1).max(160),
  dba: z.string().max(160).optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  contactTitle: z.string().max(80).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  mobile: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(60).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  country: z.string().max(60).optional().nullable(),
  customerType: z.enum([
    "RETAILER",
    "LOUNGE",
    "DISTRIBUTOR",
    "ONLINE_CUSTOMER",
    "EVENT_LEAD",
    "OTHER",
  ]),
  source: z
    .enum(["BROKER", "WEBSITE", "EVENT", "REFERRAL", "SOCIAL_MEDIA", "DIRECT_OUTREACH"])
    .optional()
    .nullable(),
  status: z
    .enum([
      "LEAD",
      "PROSPECT",
      "CONTACTED",
      "SAMPLE_SENT",
      "OPEN_ACCOUNT",
      "ACTIVE_CUSTOMER",
      "INACTIVE",
      "LOST",
    ])
    .default("LEAD"),
  assignedToId: z.string().optional().nullable(),
  paymentTerms: z.string().max(60).optional().nullable(),
  taxId: z.string().max(60).optional().nullable(),
  shippingMethod: z.string().max(80).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().max(5000).optional().nullable(),
  lastContactDate: z.string().optional().nullable(),
  nextFollowupDate: z.string().optional().nullable(),
});

export type CustomerResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function cleanDates<T extends { lastContactDate?: string | null; nextFollowupDate?: string | null }>(
  d: T,
): { lastContactDate?: Date | null; nextFollowupDate?: Date | null } {
  return {
    lastContactDate: d.lastContactDate ? new Date(d.lastContactDate) : null,
    nextFollowupDate: d.nextFollowupDate ? new Date(d.nextFollowupDate) : null,
  };
}

export async function createCustomer(input: unknown): Promise<CustomerResult> {
  const user = await requireUser();
  const parsed = CustomerSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }
  const d = parsed.data;
  const dates = cleanDates(d);

  const c = await prisma.customer.create({
    data: {
      businessName: d.businessName,
      dba: d.dba || null,
      contactName: d.contactName || null,
      contactTitle: d.contactTitle || null,
      email: d.email || null,
      mobile: d.mobile || null,
      phone: d.phone || null,
      address: d.address || null,
      street: d.street || null,
      city: d.city || null,
      state: d.state || null,
      zipCode: d.zipCode || null,
      country: d.country || "USA",
      customerType: d.customerType,
      source: d.source ?? null,
      status: d.status,
      assignedToId: d.assignedToId || null,
      paymentTerms: d.paymentTerms || "Net 30",
      taxId: d.taxId || null,
      shippingMethod: d.shippingMethod || null,
      tags: d.tags ?? [],
      notes: d.notes || null,
      ...dates,
    },
  });

  await audit("crm.customer_created", {
    actorId: user.id,
    entityType: "Customer",
    entityId: c.id,
    diff: { type: d.customerType, source: d.source },
  });

  revalidatePath("/crm");
  return { ok: true, id: c.id };
}

export async function updateCustomer(
  id: string,
  input: unknown,
): Promise<CustomerResult> {
  const user = await requireUser();
  const parsed = CustomerSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;
  const dates = {
    ...(d.lastContactDate !== undefined && {
      lastContactDate: d.lastContactDate ? new Date(d.lastContactDate) : null,
    }),
    ...(d.nextFollowupDate !== undefined && {
      nextFollowupDate: d.nextFollowupDate ? new Date(d.nextFollowupDate) : null,
    }),
  };

  await prisma.customer.update({
    where: { id },
    data: {
      businessName: d.businessName,
      dba: d.dba,
      contactName: d.contactName,
      contactTitle: d.contactTitle,
      email: d.email || undefined,
      mobile: d.mobile,
      phone: d.phone,
      address: d.address,
      street: d.street,
      city: d.city,
      state: d.state,
      zipCode: d.zipCode,
      country: d.country,
      customerType: d.customerType,
      source: d.source,
      status: d.status,
      assignedToId: d.assignedToId,
      paymentTerms: d.paymentTerms,
      taxId: d.taxId,
      shippingMethod: d.shippingMethod,
      tags: d.tags,
      notes: d.notes,
      ...dates,
    },
  });
  await audit("crm.customer_updated", {
    actorId: user.id,
    entityType: "Customer",
    entityId: id,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
  return { ok: true, id };
}

export async function deleteCustomer(id: string): Promise<CustomerResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    return { ok: false, error: "Admin only." };
  }
  await prisma.customer.delete({ where: { id } });
  await audit("crm.customer_deleted", {
    actorId: user.id,
    entityType: "Customer",
    entityId: id,
  });
  revalidatePath("/crm");
  return { ok: true, id };
}

export async function archiveCustomer(id: string): Promise<CustomerResult> {
  const user = await requireUser();
  await prisma.customer.update({
    where: { id },
    data: { archivedAt: new Date(), status: "INACTIVE" },
  });
  await audit("crm.customer_archived", {
    actorId: user.id,
    entityType: "Customer",
    entityId: id,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
  return { ok: true, id };
}

export async function unarchiveCustomer(id: string): Promise<CustomerResult> {
  const user = await requireUser();
  await prisma.customer.update({
    where: { id },
    data: { archivedAt: null },
  });
  await audit("crm.customer_unarchived", {
    actorId: user.id,
    entityType: "Customer",
    entityId: id,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
  return { ok: true, id };
}

export async function bulkArchiveCustomers(
  ids: string[],
): Promise<CustomerResult> {
  const user = await requireUser();
  if (!ids.length) return { ok: false, error: "Nothing selected." };
  const r = await prisma.customer.updateMany({
    where: { id: { in: ids } },
    data: { archivedAt: new Date(), status: "INACTIVE" },
  });
  await audit("crm.customers_bulk_archived", {
    actorId: user.id,
    entityType: "Customer",
    diff: { count: r.count, ids },
  });
  revalidatePath("/crm");
  return { ok: true, id: String(r.count) };
}

/**
 * Hard delete — admin only. Cascades sales, orders, payment links, and
 * cards on file for the selected customers.
 */
export async function bulkDeleteCustomers(
  ids: string[],
): Promise<CustomerResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin only." };
  if (!ids.length) return { ok: false, error: "Nothing selected." };
  const r = await prisma.customer.deleteMany({ where: { id: { in: ids } } });
  await audit("crm.customers_bulk_deleted", {
    actorId: user.id,
    entityType: "Customer",
    diff: { count: r.count, ids },
  });
  revalidatePath("/crm");
  revalidatePath("/sales");
  return { ok: true, id: String(r.count) };
}
