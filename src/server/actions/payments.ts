"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  verifyCardToken,
  chargeStoredCard as helcimCharge,
  helcimConfigured,
} from "@/server/payments/helcim";

export type PaymentActionResult<TExtra extends object = object> =
  | ({ ok: true } & TExtra)
  | { ok: false; error: string };

const DEFAULT_LINK_TTL_DAYS = 7;

function shortCode(): string {
  // 8 bytes → ~11 url-safe chars. Plenty of entropy for unguessable links.
  return randomBytes(8).toString("base64url");
}

function paymentUrl(code: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/pay/${code}`;
}

// ─────────────────────────────────────────────────────────────────
// createPaymentLink — generate a short URL for a customer/order
// ─────────────────────────────────────────────────────────────────

const CreateLinkSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().optional().nullable(),
  /** Override the amount; if omitted, falls back to order.totalRevenue. */
  amountCents: z.number().int().positive().optional(),
  expiresInDays: z.number().int().positive().max(60).optional(),
});

export async function createPaymentLink(
  input: unknown,
): Promise<PaymentActionResult<{ code: string; url: string }>> {
  const user = await requireUser();
  const parsed = CreateLinkSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }
  const d = parsed.data;

  let amountCents = d.amountCents;
  if (!amountCents && d.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: d.orderId },
      select: { totalRevenue: true, customerId: true },
    });
    if (!order) return { ok: false, error: "Order not found." };
    if (order.customerId !== d.customerId) {
      return { ok: false, error: "Order does not belong to this customer." };
    }
    amountCents = Math.round(Number(order.totalRevenue.toString()) * 100);
  }
  if (!amountCents || amountCents <= 0) {
    return { ok: false, error: "Amount is required." };
  }

  const ttl = d.expiresInDays ?? DEFAULT_LINK_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttl * 86_400_000);

  const link = await prisma.paymentLink.create({
    data: {
      code: shortCode(),
      customerId: d.customerId,
      orderId: d.orderId || null,
      amountCents,
      expiresAt,
      createdById: user.id,
    },
  });

  await audit("payments.link_created", {
    actorId: user.id,
    entityType: "PaymentLink",
    entityId: link.id,
    diff: {
      customerId: d.customerId,
      orderId: d.orderId ?? null,
      amountCents,
    },
  });

  revalidatePath(`/crm/${d.customerId}`);
  return { ok: true, code: link.code, url: paymentUrl(link.code) };
}

// ─────────────────────────────────────────────────────────────────
// voidPaymentLink — cancel a link before it's used
// ─────────────────────────────────────────────────────────────────

export async function voidPaymentLink(
  linkId: string,
): Promise<PaymentActionResult> {
  const user = await requireUser();
  const link = await prisma.paymentLink.findUnique({ where: { id: linkId } });
  if (!link) return { ok: false, error: "Link not found." };
  if (link.status === "CHARGED") {
    return { ok: false, error: "Already charged — can't void." };
  }
  await prisma.paymentLink.update({
    where: { id: linkId },
    data: { status: "VOIDED" },
  });
  await audit("payments.link_voided", {
    actorId: user.id,
    entityType: "PaymentLink",
    entityId: linkId,
  });
  revalidatePath(`/crm/${link.customerId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// submitPaymentToken — PUBLIC. Called by the iframe form on /pay/[code].
// ─────────────────────────────────────────────────────────────────

const SubmitTokenSchema = z.object({
  code: z.string().min(1),
  helcimCardToken: z.string().min(1),
  helcimCustomerCode: z.string().min(1),
});

export async function submitPaymentToken(
  input: unknown,
): Promise<PaymentActionResult> {
  // NOTE: deliberately NO requireUser() — this runs from the unauthenticated
  // /pay page. Validation is the only gate.
  const parsed = SubmitTokenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const link = await prisma.paymentLink.findUnique({
    where: { code: d.code },
  });
  if (!link) return { ok: false, error: "Payment link not found." };
  if (link.status !== "PENDING") {
    return { ok: false, error: "This link is no longer accepting cards." };
  }
  if (link.expiresAt.getTime() < Date.now()) {
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: "EXPIRED" },
    });
    return { ok: false, error: "This link has expired." };
  }

  // Confirm the token with Helcim and pull the canonical card metadata
  // (last4, brand, expiry) from their side — don't trust the client.
  const verified = await verifyCardToken({
    cardToken: d.helcimCardToken,
    customerCode: d.helcimCustomerCode,
  });
  if (!verified.ok) {
    return { ok: false, error: `Card could not be verified: ${verified.error}` };
  }

  const card = await prisma.cardOnFile.create({
    data: {
      customerId: link.customerId,
      helcimCustomerCode: verified.data.helcimCustomerCode,
      helcimCardToken: verified.data.helcimCardToken,
      brand: verified.data.brand || "card",
      last4: verified.data.last4 || "0000",
      expMonth: verified.data.expMonth || 0,
      expYear: verified.data.expYear || 0,
    },
  });

  await prisma.paymentLink.update({
    where: { id: link.id },
    data: {
      status: "CARD_CAPTURED",
      capturedCardId: card.id,
    },
  });

  await audit("payments.card_captured", {
    actorId: null,
    entityType: "PaymentLink",
    entityId: link.id,
    diff: { cardId: card.id, brand: card.brand, last4: card.last4 },
  });

  revalidatePath(`/crm/${link.customerId}`);
  revalidatePath(`/pay/${link.code}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// chargeStoredCard — sales-rep flips an unpaid order to paid
// ─────────────────────────────────────────────────────────────────

const ChargeSchema = z.object({
  orderId: z.string().min(1),
  cardOnFileId: z.string().min(1),
  /** Optional override; defaults to order.totalRevenue */
  amountCents: z.number().int().positive().optional(),
});

export async function chargeStoredCard(
  input: unknown,
): Promise<PaymentActionResult<{ transactionId: string }>> {
  const user = await requireUser();
  if (!helcimConfigured()) {
    return {
      ok: false,
      error:
        "Helcim is not configured yet. Add HELCIM_API_TOKEN + HELCIM_ACCOUNT_ID.",
    };
  }

  const parsed = ChargeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const [order, card] = await Promise.all([
    prisma.order.findUnique({ where: { id: d.orderId } }),
    prisma.cardOnFile.findUnique({ where: { id: d.cardOnFileId } }),
  ]);
  if (!order) return { ok: false, error: "Order not found." };
  if (!card) return { ok: false, error: "Card on file not found." };
  if (card.customerId !== order.customerId) {
    return { ok: false, error: "Card does not belong to this customer." };
  }
  if (order.paymentStatus === "PAID") {
    return { ok: false, error: "Order is already paid." };
  }

  const amountCents =
    d.amountCents ??
    Math.round(Number(order.totalRevenue.toString()) * 100);
  if (amountCents <= 0) return { ok: false, error: "Amount must be positive." };

  // Idempotency: stable per (order, card, amount). If a network hiccup
  // makes the rep click twice, Helcim returns the original transaction
  // instead of double-charging.
  const idempotencyKey = `order-${order.id}-${card.id}-${amountCents}`;
  const description = `EmberOS order ${order.id} — ${order.product}`;

  const charge = await helcimCharge({
    helcimCustomerCode: card.helcimCustomerCode,
    helcimCardToken: card.helcimCardToken,
    amountCents,
    idempotencyKey,
    description,
  });
  if (!charge.ok) {
    await audit("payments.charge_failed", {
      actorId: user.id,
      entityType: "Order",
      entityId: order.id,
      diff: { error: charge.error, amountCents, cardId: card.id },
    });
    return { ok: false, error: charge.error };
  }
  if (charge.data.status !== "APPROVED") {
    await audit("payments.charge_declined", {
      actorId: user.id,
      entityType: "Order",
      entityId: order.id,
      diff: { amountCents, cardId: card.id },
    });
    return { ok: false, error: "Card was declined." };
  }

  // Atomic: flip the order + any linked payment link to PAID/CHARGED.
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID" },
    }),
    prisma.paymentLink.updateMany({
      where: {
        orderId: order.id,
        capturedCardId: card.id,
        status: "CARD_CAPTURED",
      },
      data: { status: "CHARGED" },
    }),
  ]);

  await audit("payments.charge_approved", {
    actorId: user.id,
    entityType: "Order",
    entityId: order.id,
    diff: {
      amountCents,
      cardId: card.id,
      transactionId: charge.data.transactionId,
    },
  });

  revalidatePath(`/crm/${order.customerId}`);
  revalidatePath("/crm");
  return { ok: true, transactionId: charge.data.transactionId };
}

// ─────────────────────────────────────────────────────────────────
// archiveCardOnFile — soft-delete (customer asks to remove)
// ─────────────────────────────────────────────────────────────────

export async function archiveCardOnFile(
  cardId: string,
): Promise<PaymentActionResult> {
  const user = await requireUser();
  const card = await prisma.cardOnFile.findUnique({ where: { id: cardId } });
  if (!card) return { ok: false, error: "Card not found." };
  await prisma.cardOnFile.update({
    where: { id: cardId },
    data: { archivedAt: new Date() },
  });
  await audit("payments.card_archived", {
    actorId: user.id,
    entityType: "CardOnFile",
    entityId: cardId,
  });
  revalidatePath(`/crm/${card.customerId}`);
  return { ok: true };
}
