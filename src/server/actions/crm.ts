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
  contactName: z.string().max(120).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  customerType: z.enum([
    "RETAILER",
    "LOUNGE",
    "DISTRIBUTOR",
    "ONLINE_CUSTOMER",
    "EVENT_LEAD",
  ]),
  source: z
    .enum(["BROKER", "WEBSITE", "EVENT", "REFERRAL", "SOCIAL_MEDIA", "DIRECT_OUTREACH"])
    .optional()
    .nullable(),
  status: z
    .enum([
      "LEAD",
      "CONTACTED",
      "SAMPLE_SENT",
      "OPEN_ACCOUNT",
      "ACTIVE_CUSTOMER",
      "INACTIVE",
      "LOST",
    ])
    .default("LEAD"),
  assignedToId: z.string().optional().nullable(),
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
      contactName: d.contactName || null,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      customerType: d.customerType,
      source: d.source ?? null,
      status: d.status,
      assignedToId: d.assignedToId || null,
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
      contactName: d.contactName,
      email: d.email || undefined,
      phone: d.phone,
      address: d.address,
      customerType: d.customerType,
      source: d.source,
      status: d.status,
      assignedToId: d.assignedToId,
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

  const order = await prisma.order.create({
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
    },
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
  return { ok: true, id: order.id };
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
  await prisma.order.delete({ where: { id: orderId } });
  await audit("crm.order_deleted", {
    actorId: user.id,
    entityType: "Order",
    entityId: orderId,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/${order.customerId}`);
  return { ok: true, id: orderId };
}
