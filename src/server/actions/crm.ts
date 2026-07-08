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

// ─────────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────────

const OrderSchema = z.object({
  customerId: z.string().min(1),
  orderDate: z.string().optional().nullable(),
  product: z.string().min(1).max(120),
  boxQuantity: z.number().int().positive(),
  pricePerBox: z.number().nonnegative(),
  costPerBox: z.number().nonnegative(), // for COGS calculation
  brokerCommissionPct: z.number().min(0).max(1).default(0.15),
  paymentStatus: z
    .enum(["UNPAID", "PAID", "PARTIAL", "OVERDUE", "REFUNDED"])
    .default("UNPAID"),
  fulfillmentStatus: z
    .enum(["PENDING", "IN_PROGRESS", "SHIPPED", "DELIVERED", "CANCELLED"])
    .default("PENDING"),
  reorderDueDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  /** Optional SKU link — when set, inventory is auto-deducted */
  inventoryItemId: z.string().optional().nullable(),
});

export type OrderResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createOrder(input: unknown): Promise<OrderResult> {
  const user = await requireUser();
  const parsed = OrderSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }
  const d = parsed.data;
  const totalRevenue = d.boxQuantity * d.pricePerBox;
  const brokerCommission = totalRevenue * d.brokerCommissionPct;
  const costOfGoods = d.boxQuantity * d.costPerBox;
  const grossProfit = totalRevenue - costOfGoods;
  const netProfit = grossProfit - brokerCommission;

  // If linked to an SKU, perform order create + inventory deduct + audit
  // adjustment as a single transaction — never leave inventory in a half
  // state.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId: d.customerId,
        orderDate: d.orderDate ? new Date(d.orderDate) : new Date(),
        product: d.product,
        boxQuantity: d.boxQuantity,
        pricePerBox: d.pricePerBox,
        totalRevenue,
        brokerCommission,
        costOfGoods,
        grossProfit,
        netProfit,
        paymentStatus: d.paymentStatus,
        fulfillmentStatus: d.fulfillmentStatus,
        reorderDueDate: d.reorderDueDate ? new Date(d.reorderDueDate) : null,
        notes: d.notes || null,
        createdById: user.id,
        inventoryItemId: d.inventoryItemId || null,
      },
    });

    if (d.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: d.inventoryItemId },
        data: { packagesOnHand: { decrement: d.boxQuantity } },
      });
      await tx.inventoryAdjustment.create({
        data: {
          inventoryItemId: d.inventoryItemId,
          packagesDelta: -d.boxQuantity,
          reason: "SALE",
          orderId: created.id,
          createdById: user.id,
          notes: `Auto-deducted on order create`,
        },
      });
    }

    return created;
  });

  // Update the customer's lastContactDate to today on order create
  await prisma.customer.update({
    where: { id: d.customerId },
    data: { lastContactDate: new Date() },
  });

  await audit("crm.order_created", {
    actorId: user.id,
    entityType: "Order",
    entityId: order.id,
    diff: {
      customerId: d.customerId,
      boxQuantity: d.boxQuantity,
      totalRevenue,
    },
  });

  revalidatePath("/crm");
  revalidatePath(`/crm/${d.customerId}`);
  if (d.inventoryItemId) {
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${d.inventoryItemId}`);
  }
  return { ok: true, id: order.id };
}

// ─────────────────────────────────────────────────────────────────
// updateOrder — full edit with inventory + financial reconciliation
// ─────────────────────────────────────────────────────────────────

const OrderUpdateSchema = z.object({
  orderDate: z.string().optional(),
  product: z.string().min(1).max(120).optional(),
  boxQuantity: z.number().int().positive().optional(),
  pricePerBox: z.number().nonnegative().optional(),
  costPerBox: z.number().nonnegative().optional(),
  brokerCommissionPct: z.number().min(0).max(1).optional(),
  paymentStatus: z
    .enum(["UNPAID", "PAID", "PARTIAL", "OVERDUE", "REFUNDED"])
    .optional(),
  fulfillmentStatus: z
    .enum(["PENDING", "IN_PROGRESS", "SHIPPED", "DELIVERED", "CANCELLED"])
    .optional(),
  reorderDueDate: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Update any order field, atomically reconciling:
 *  - inventory delta when boxQuantity changes (and SKU is linked):
 *    adjusts packagesOnHand by the delta + writes a CORRECTION row.
 *  - financial fields (revenue/profit/commission) when any input changes,
 *    using existing values for fields not in the patch.
 */
export async function updateOrder(
  orderId: string,
  input: unknown,
): Promise<OrderResult> {
  const user = await requireUser();
  const parsed = OrderUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }
  const patch = parsed.data;

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) return { ok: false, error: "Order not found." };

  // Pull existing decimals into numbers for the math
  const exPrice = Number(existing.pricePerBox.toString());
  const exQty = existing.boxQuantity;
  const exCommissionPct = existing.brokerCommission && existing.totalRevenue
    ? Number(existing.brokerCommission.toString()) /
      Number(existing.totalRevenue.toString())
    : 0.15;
  const exCostPerBox = exQty > 0
    ? Number(existing.costOfGoods.toString()) / exQty
    : 0;

  const nextQty = patch.boxQuantity ?? exQty;
  const nextPrice = patch.pricePerBox ?? exPrice;
  const nextCostPerBox = patch.costPerBox ?? exCostPerBox;
  const nextCommissionPct = patch.brokerCommissionPct ?? exCommissionPct;

  const totalRevenue = nextQty * nextPrice;
  const brokerCommission = totalRevenue * nextCommissionPct;
  const costOfGoods = nextQty * nextCostPerBox;
  const grossProfit = totalRevenue - costOfGoods;
  const netProfit = grossProfit - brokerCommission;
  const qtyDelta = nextQty - exQty;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          orderDate: patch.orderDate ? new Date(patch.orderDate) : undefined,
          product: patch.product,
          boxQuantity: nextQty,
          pricePerBox: nextPrice,
          totalRevenue,
          brokerCommission,
          costOfGoods,
          grossProfit,
          netProfit,
          paymentStatus: patch.paymentStatus,
          fulfillmentStatus: patch.fulfillmentStatus,
          reorderDueDate:
            patch.reorderDueDate === undefined
              ? undefined
              : patch.reorderDueDate
                ? new Date(patch.reorderDueDate)
                : null,
          notes: patch.notes === undefined ? undefined : patch.notes || null,
        },
      });

      // If quantity changed and the order is linked to a SKU, reconcile
      // inventory and write a CORRECTION adjustment so the audit trail
      // shows the round-trip.
      if (qtyDelta !== 0 && existing.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: existing.inventoryItemId },
          data: { packagesOnHand: { decrement: qtyDelta } },
        });
        await tx.inventoryAdjustment.create({
          data: {
            inventoryItemId: existing.inventoryItemId,
            packagesDelta: -qtyDelta,
            reason: "CORRECTION",
            orderId,
            createdById: user.id,
            notes: `Order qty changed ${exQty} → ${nextQty}`,
          },
        });
      }
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Update failed",
    };
  }

  await audit("crm.order_updated", {
    actorId: user.id,
    entityType: "Order",
    entityId: orderId,
    diff: {
      qtyChange: qtyDelta,
      newRevenue: totalRevenue,
    },
  });

  revalidatePath("/crm");
  revalidatePath(`/crm/${existing.customerId}`);
  if (existing.inventoryItemId) {
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${existing.inventoryItemId}`);
  }
  return { ok: true, id: orderId };
}

export async function updateOrderStatus(
  orderId: string,
  patch: {
    paymentStatus?:
      | "UNPAID" | "PAID" | "PARTIAL" | "OVERDUE" | "REFUNDED";
    fulfillmentStatus?:
      | "PENDING" | "IN_PROGRESS" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  },
): Promise<OrderResult> {
  const user = await requireUser();
  const order = await prisma.order.update({
    where: { id: orderId },
    data: patch,
  });
  await audit("crm.order_status_updated", {
    actorId: user.id,
    entityType: "Order",
    entityId: orderId,
    diff: patch,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/${order.customerId}`);
  return { ok: true, id: orderId };
}

export async function deleteOrder(orderId: string): Promise<OrderResult> {
  const user = await requireUser();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Order not found." };
  if (user.role !== "ADMIN" && order.createdById !== user.id) {
    return { ok: false, error: "Only admins or the creator can delete." };
  }

  // Atomic: restore inventory + delete order. The original SALE
  // adjustment cascade-detaches (orderId becomes null) — we add a
  // RETURN adjustment representing the restock so the audit trail
  // shows the round-trip.
  await prisma.$transaction(async (tx) => {
    if (order.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: order.inventoryItemId },
        data: { packagesOnHand: { increment: order.boxQuantity } },
      });
      await tx.inventoryAdjustment.create({
        data: {
          inventoryItemId: order.inventoryItemId,
          packagesDelta: order.boxQuantity,
          reason: "RETURN",
          createdById: user.id,
          notes: `Auto-restored on order delete (was order ${orderId})`,
        },
      });
    }
    await tx.order.delete({ where: { id: orderId } });
  });

  await audit("crm.order_deleted", {
    actorId: user.id,
    entityType: "Order",
    entityId: orderId,
    diff: { restoredInventory: Boolean(order.inventoryItemId) },
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/${order.customerId}`);
  if (order.inventoryItemId) {
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${order.inventoryItemId}`);
  }
  return { ok: true, id: orderId };
}
