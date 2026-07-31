"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { n } from "@/server/sales";
import { openai, MODELS } from "@/lib/openai";

export type EventResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function firstError(e: z.ZodError): string {
  const f = e.errors[0];
  return f ? `${f.path.join(".")}: ${f.message}` : "Invalid input";
}

function revalidateEvents(id?: string) {
  revalidatePath("/events");
  if (id) revalidatePath(`/events/${id}`);
}

// ─────────────────────────────────────────────────────────────────
// Event CRUD
// ─────────────────────────────────────────────────────────────────

const EventSchema = z.object({
  name: z.string().min(1).max(160),
  venue: z.string().max(200).optional().nullable(),
  startsAt: z.string().min(1),
  notes: z.string().max(5000).optional().nullable(),
});

export async function createEvent(input: unknown): Promise<EventResult> {
  const user = await requireUser();
  const parsed = EventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const ev = await prisma.sellingEvent.create({
    data: {
      name: d.name,
      venue: d.venue || null,
      startsAt: new Date(d.startsAt),
      notes: d.notes || null,
      createdById: user.id,
    },
  });
  await audit("events.created", {
    actorId: user.id,
    entityType: "SellingEvent",
    entityId: ev.id,
  });
  revalidateEvents();
  return { ok: true, id: ev.id };
}

export async function updateEvent(
  id: string,
  input: unknown,
): Promise<EventResult> {
  await requireUser();
  const parsed = EventSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  await prisma.sellingEvent.update({
    where: { id },
    data: {
      name: d.name,
      venue: d.venue === undefined ? undefined : d.venue || null,
      startsAt: d.startsAt ? new Date(d.startsAt) : undefined,
      notes: d.notes === undefined ? undefined : d.notes || null,
    },
  });
  revalidateEvents(id);
  return { ok: true, id };
}

export async function deleteEvent(id: string): Promise<EventResult> {
  const user = await requireUser();
  const ev = await prisma.sellingEvent.findUnique({
    where: { id },
    select: { sealedAt: true },
  });
  if (!ev) return { ok: false, error: "Event not found." };
  if (ev.sealedAt) {
    return { ok: false, error: "This event is sealed — it's a permanent record." };
  }
  await prisma.sellingEvent.delete({ where: { id } });
  await audit("events.deleted", {
    actorId: user.id,
    entityType: "SellingEvent",
    entityId: id,
  });
  revalidateEvents();
  return { ok: true, id };
}

export async function goLive(id: string): Promise<EventResult> {
  const user = await requireUser();
  const ev = await prisma.sellingEvent.findUnique({
    where: { id },
    select: { status: true, _count: { select: { items: true } } },
  });
  if (!ev) return { ok: false, error: "Event not found." };
  if (ev.status === "CLOSED") return { ok: false, error: "Event is closed — reopen it instead." };
  if (ev._count.items === 0) {
    return { ok: false, error: "Add at least one item to the sell sheet first." };
  }
  await prisma.sellingEvent.update({ where: { id }, data: { status: "LIVE" } });
  await audit("events.went_live", {
    actorId: user.id,
    entityType: "SellingEvent",
    entityId: id,
  });
  revalidateEvents(id);
  return { ok: true, id };
}

/**
 * Sealing an event closes it, deducts linked inventory, and makes the
 * record permanent — no reopen, no delete. Works on LIVE or on an
 * already-CLOSED (but unsealed) event.
 */
export async function sealEvent(id: string): Promise<EventResult> {
  const user = await requireUser();
  const ev = await prisma.sellingEvent.findUnique({
    where: { id },
    include: {
      items: { select: { id: true, label: true, inventoryItemId: true } },
      sales: { select: { itemId: true, qty: true } },
    },
  });
  if (!ev) return { ok: false, error: "Event not found." };
  if (ev.sealedAt) return { ok: true, id };

  await prisma.sellingEvent.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: ev.closedAt ?? new Date(),
      sealedAt: new Date(),
    },
  });

  // Stock deduction for inventory-linked lines — once per event.
  if (!ev.inventoryDeductedAt) {
    const soldByItem = new Map<string, number>();
    for (const s of ev.sales) {
      soldByItem.set(s.itemId, (soldByItem.get(s.itemId) ?? 0) + s.qty);
    }
    const deductions = ev.items
      .filter((i) => i.inventoryItemId && (soldByItem.get(i.id) ?? 0) > 0)
      .map((i) => ({
        inventoryItemId: i.inventoryItemId!,
        qty: soldByItem.get(i.id)!,
        label: i.label,
      }));

    for (const d of deductions) {
      await prisma.$transaction([
        prisma.inventoryItem.update({
          where: { id: d.inventoryItemId },
          data: { packagesOnHand: { decrement: d.qty } },
        }),
        prisma.inventoryAdjustment.create({
          data: {
            inventoryItemId: d.inventoryItemId,
            packagesDelta: -d.qty,
            reason: "EVENT",
            notes: `Event "${ev.name}" — ${d.qty} × ${d.label}`,
            createdById: user.id,
          },
        }),
      ]);
    }
    if (deductions.length > 0) {
      await prisma.sellingEvent.update({
        where: { id },
        data: { inventoryDeductedAt: new Date() },
      });
      revalidatePath("/inventory");
    }
  }

  await audit("events.sealed", {
    actorId: user.id,
    entityType: "SellingEvent",
    entityId: id,
  });
  revalidateEvents(id);
  return { ok: true, id };
}

export async function reopenEvent(id: string): Promise<EventResult> {
  const user = await requireUser();
  const ev = await prisma.sellingEvent.findUnique({
    where: { id },
    select: { sealedAt: true },
  });
  if (!ev) return { ok: false, error: "Event not found." };
  if (ev.sealedAt) {
    return { ok: false, error: "This event is sealed — it can't be reopened." };
  }
  await prisma.sellingEvent.update({
    where: { id },
    data: { status: "LIVE", closedAt: null },
  });
  await audit("events.reopened", {
    actorId: user.id,
    entityType: "SellingEvent",
    entityId: id,
  });
  revalidateEvents(id);
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// Sell sheet
// ─────────────────────────────────────────────────────────────────

const ItemSchema = z.object({
  label: z.string().min(1).max(120),
  unitPrice: z.number().nonnegative(),
  qtyBrought: z.number().int().nonnegative(),
  inventoryItemId: z.string().optional().nullable(),
});

export async function addEventItem(
  eventId: string,
  input: unknown,
): Promise<EventResult> {
  await requireUser();
  const parsed = ItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const ev = await prisma.sellingEvent.findUnique({
    where: { id: eventId },
    select: { status: true, _count: { select: { items: true } } },
  });
  if (!ev) return { ok: false, error: "Event not found." };
  if (ev.status === "CLOSED") return { ok: false, error: "Event is closed." };

  const item = await prisma.eventItem.create({
    data: {
      eventId,
      label: parsed.data.label,
      unitPrice: parsed.data.unitPrice,
      qtyBrought: parsed.data.qtyBrought,
      inventoryItemId: parsed.data.inventoryItemId || null,
      sortOrder: ev._count.items,
    },
  });
  revalidateEvents(eventId);
  return { ok: true, id: item.id };
}

export async function updateEventItem(
  id: string,
  input: unknown,
): Promise<EventResult> {
  await requireUser();
  const parsed = ItemSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const item = await prisma.eventItem.update({
    where: { id },
    data: {
      label: parsed.data.label,
      unitPrice: parsed.data.unitPrice,
      qtyBrought: parsed.data.qtyBrought,
      inventoryItemId:
        parsed.data.inventoryItemId === undefined
          ? undefined
          : parsed.data.inventoryItemId || null,
    },
  });
  revalidateEvents(item.eventId);
  return { ok: true, id };
}

export async function deleteEventItem(id: string): Promise<EventResult> {
  await requireUser();
  const item = await prisma.eventItem.findUnique({
    where: { id },
    select: { eventId: true, _count: { select: { sales: true } } },
  });
  if (!item) return { ok: false, error: "Item not found." };
  if (item._count.sales > 0) {
    return { ok: false, error: "This item has recorded sales — it can't be removed." };
  }
  await prisma.eventItem.delete({ where: { id } });
  revalidateEvents(item.eventId);
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// Recording sales (tap + undo)
// ─────────────────────────────────────────────────────────────────

const SaleSchema = z.object({
  itemId: z.string().min(1),
  qty: z.number().int().min(1).max(500).default(1),
  unitPrice: z.number().nonnegative().optional().nullable(),
});

export async function recordEventSale(
  eventId: string,
  input: unknown,
): Promise<EventResult> {
  const user = await requireUser();
  const parsed = SaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;

  const item = await prisma.eventItem.findUnique({
    where: { id: d.itemId },
    select: { eventId: true, unitPrice: true, event: { select: { status: true } } },
  });
  if (!item || item.eventId !== eventId) return { ok: false, error: "Item not found." };
  if (item.event.status !== "LIVE") {
    return { ok: false, error: "The event isn't live — go live to record sales." };
  }

  const sale = await prisma.eventSale.create({
    data: {
      eventId,
      itemId: d.itemId,
      qty: d.qty,
      unitPrice: d.unitPrice ?? item.unitPrice,
      soldById: user.id,
      source: "TAP",
    },
  });
  revalidateEvents(eventId);
  return { ok: true, id: sale.id };
}

export async function undoEventSale(saleId: string): Promise<EventResult> {
  await requireUser();
  const sale = await prisma.eventSale.findUnique({
    where: { id: saleId },
    select: { eventId: true, event: { select: { status: true } } },
  });
  if (!sale) return { ok: false, error: "Sale not found." };
  if (sale.event.status === "CLOSED") {
    return { ok: false, error: "Event is closed — reopen it to make corrections." };
  }
  await prisma.eventSale.delete({ where: { id: saleId } });
  revalidateEvents(sale.eventId);
  return { ok: true, id: saleId };
}

// ─────────────────────────────────────────────────────────────────
// Live snapshot — polled by every phone at the event
// ─────────────────────────────────────────────────────────────────

export type EventSnapshot = {
  status: string;
  items: {
    id: string;
    label: string;
    unitPrice: number;
    qtyBrought: number;
    sold: number;
    revenue: number;
  }[];
  totalUnits: number;
  totalRevenue: number;
  recentSales: {
    id: string;
    itemLabel: string;
    qty: number;
    unitPrice: number;
    soldBy: string | null;
    source: string;
    soldAt: string;
  }[];
};

export async function getEventSnapshot(
  eventId: string,
): Promise<{ ok: true; snapshot: EventSnapshot } | { ok: false; error: string }> {
  await requireUser();
  const ev = await prisma.sellingEvent.findUnique({
    where: { id: eventId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      sales: {
        orderBy: { soldAt: "desc" },
        include: {
          item: { select: { label: true } },
          soldBy: { select: { fullName: true, email: true } },
        },
      },
    },
  });
  if (!ev) return { ok: false, error: "Event not found." };

  const soldByItem = new Map<string, { sold: number; revenue: number }>();
  let totalUnits = 0;
  let totalRevenue = 0;
  for (const s of ev.sales) {
    const acc = soldByItem.get(s.itemId) ?? { sold: 0, revenue: 0 };
    const rev = s.qty * n(s.unitPrice);
    acc.sold += s.qty;
    acc.revenue += rev;
    soldByItem.set(s.itemId, acc);
    totalUnits += s.qty;
    totalRevenue += rev;
  }

  return {
    ok: true,
    snapshot: {
      status: ev.status,
      items: ev.items.map((i) => ({
        id: i.id,
        label: i.label,
        unitPrice: n(i.unitPrice),
        qtyBrought: i.qtyBrought,
        sold: soldByItem.get(i.id)?.sold ?? 0,
        revenue: soldByItem.get(i.id)?.revenue ?? 0,
      })),
      totalUnits,
      totalRevenue,
      recentSales: ev.sales.slice(0, 12).map((s) => ({
        id: s.id,
        itemLabel: s.item.label,
        qty: s.qty,
        unitPrice: n(s.unitPrice),
        soldBy: s.soldBy?.fullName ?? s.soldBy?.email ?? null,
        source: s.source,
        soldAt: s.soldAt.toISOString(),
      })),
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Ambrosi — voice sale capture
// ─────────────────────────────────────────────────────────────────

export type VoiceSaleResult =
  | {
      ok: true;
      saleId: string;
      itemLabel: string;
      qty: number;
      unitPrice: number;
      transcript: string;
    }
  | { ok: false; error: string; transcript?: string };

export async function voiceEventSale(
  eventId: string,
  formData: FormData,
): Promise<VoiceSaleResult> {
  const user = await requireUser();

  const ev = await prisma.sellingEvent.findUnique({
    where: { id: eventId },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!ev) return { ok: false, error: "Event not found." };
  if (ev.status !== "LIVE") return { ok: false, error: "The event isn't live." };

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return { ok: false, error: "No audio received — hold the button while speaking." };
  }
  if (audio.size > 5_000_000) {
    return { ok: false, error: "Recording too long — keep it to a sentence." };
  }

  const client = openai();

  // 1. Transcribe
  let transcript: string;
  try {
    const t = await client.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
      prompt:
        "Cigar event sales. Short phrases like: sold a three pack, two singles at fifteen, one box at two eighty.",
    });
    transcript = t.text.trim();
  } catch {
    return { ok: false, error: "Couldn't transcribe — try again closer to the mic." };
  }
  if (!transcript) return { ok: false, error: "Heard nothing — try again." };

  // 2. Parse against the sell sheet
  const sheet = ev.items
    .map((i, idx) => `${idx}: ${i.label} ($${n(i.unitPrice)})`)
    .join("\n");
  let parsed: { itemIndex: number; qty: number; unitPrice: number | null };
  try {
    const r = await client.chat.completions.create({
      model: MODELS.fast(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You convert a seller's spoken phrase into a sale against this sell sheet:\n${sheet}\n\nReturn JSON: {"itemIndex": <index of the best-matching item, or -1 if nothing matches>, "qty": <units sold, default 1>, "unitPrice": <spoken price PER UNIT in dollars, or null if no price was spoken>}. "Three-pack" style names refer to one unit of that item unless a count is spoken ("two three-packs" = qty 2). If a total price is spoken for multiple units ("two singles for thirty"), divide to get the per-unit price.`,
        },
        { role: "user", content: transcript },
      ],
    });
    parsed = JSON.parse(r.choices[0]?.message?.content ?? "{}");
  } catch {
    return { ok: false, error: "Couldn't understand the sale.", transcript };
  }

  const item = ev.items[parsed.itemIndex];
  if (!item) {
    return {
      ok: false,
      error: `Couldn't match "${transcript}" to the sell sheet.`,
      transcript,
    };
  }
  const qty = Math.min(500, Math.max(1, Math.round(Number(parsed.qty) || 1)));
  const unitPrice =
    parsed.unitPrice != null && Number.isFinite(Number(parsed.unitPrice)) && Number(parsed.unitPrice) >= 0
      ? Number(parsed.unitPrice)
      : n(item.unitPrice);

  const sale = await prisma.eventSale.create({
    data: {
      eventId,
      itemId: item.id,
      qty,
      unitPrice,
      soldById: user.id,
      source: "VOICE",
      transcript,
    },
  });
  revalidateEvents(eventId);
  return {
    ok: true,
    saleId: sale.id,
    itemLabel: item.label,
    qty,
    unitPrice,
    transcript,
  };
}
