"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/server/auth";
import { audit } from "@/server/audit";

const ItemSchema = z.object({
  sku: z.string().min(1).max(60).regex(/^[A-Za-z0-9._-]+$/, "SKU: letters, numbers, . _ - only"),
  productName: z.string().min(1).max(160),
  blend: z
    .enum(["MADURO", "CONNECTICUT", "HABANO", "COSECHA_DORADA", "CUSTOM"])
    .optional()
    .nullable(),
  blendCustom: z.string().max(80).optional().nullable(),
  packagingType: z.enum(["BOX", "SINGLE", "THREE_PACK", "FIVE_PACK", "BUNDLE"]),
  unitsPerPackage: z.number().int().positive(),
  packagesOnHand: z.number().int().nonnegative().default(0),
  costPerUnit: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative(),
  retailPrice: z.number().nonnegative().default(0),
  reorderThreshold: z.number().int().nonnegative().default(0),
  preferredReorderQty: z.number().int().nonnegative().default(0),
  supplier: z.string().max(120).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  status: z
    .enum(["ACTIVE", "LOW_STOCK", "OUT_OF_STOCK", "DISCONTINUED"])
    .default("ACTIVE"),
  barcode: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type InventoryResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createInventoryItem(input: unknown): Promise<InventoryResult> {
  const user = await requireUser();
  const parsed = ItemSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }

  const d = parsed.data;
  try {
    const item = await prisma.inventoryItem.create({
      data: {
        ...d,
        supplier: d.supplier ?? null,
        location: d.location ?? null,
        blend: d.blend ?? null,
        blendCustom: d.blendCustom ?? null,
        barcode: d.barcode ?? null,
        notes: d.notes ?? null,
      },
    });
    await audit("inventory.item_created", {
      actorId: user.id,
      entityType: "InventoryItem",
      entityId: item.id,
    });
    revalidatePath("/inventory");
    return { ok: true, id: item.id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { ok: false, error: `SKU "${d.sku}" already exists.` };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Create failed" };
  }
}

export async function updateInventoryItem(
  id: string,
  input: unknown,
): Promise<InventoryResult> {
  const user = await requireUser();
  const parsed = ItemSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await prisma.inventoryItem.update({
    where: { id },
    data: {
      ...parsed.data,
      supplier: parsed.data.supplier ?? undefined,
      location: parsed.data.location ?? undefined,
      blend: parsed.data.blend ?? undefined,
      blendCustom: parsed.data.blendCustom ?? undefined,
      barcode: parsed.data.barcode ?? undefined,
      notes: parsed.data.notes ?? undefined,
    },
  });
  await audit("inventory.item_updated", {
    actorId: user.id,
    entityType: "InventoryItem",
    entityId: id,
  });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return { ok: true, id };
}

export async function deleteInventoryItem(id: string): Promise<InventoryResult> {
  await requireAdmin();
  await prisma.inventoryItem.delete({ where: { id } });
  revalidatePath("/inventory");
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// Manual adjustments
// ─────────────────────────────────────────────────────────────────

const AdjustmentSchema = z.object({
  inventoryItemId: z.string().min(1),
  packagesDelta: z.number().int(),
  reason: z.enum([
    "SALE",
    "SAMPLE",
    "DAMAGE",
    "EVENT",
    "RETURN",
    "CORRECTION",
    "PURCHASE",
    "TRANSFER",
  ]),
  notes: z.string().max(1000).optional().nullable(),
});

export async function adjustInventory(input: unknown): Promise<InventoryResult> {
  const user = await requireUser();
  const parsed = AdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? first.message : "Invalid input",
    };
  }
  const d = parsed.data;
  if (d.packagesDelta === 0) {
    return { ok: false, error: "Delta must be non-zero." };
  }

  // Atomic: update stock AND record adjustment
  const result = await prisma.$transaction([
    prisma.inventoryItem.update({
      where: { id: d.inventoryItemId },
      data: {
        packagesOnHand: { increment: d.packagesDelta },
      },
    }),
    prisma.inventoryAdjustment.create({
      data: {
        inventoryItemId: d.inventoryItemId,
        packagesDelta: d.packagesDelta,
        reason: d.reason,
        notes: d.notes || null,
        createdById: user.id,
      },
    }),
  ]);

  await audit("inventory.adjustment", {
    actorId: user.id,
    entityType: "InventoryItem",
    entityId: d.inventoryItemId,
    diff: { delta: d.packagesDelta, reason: d.reason },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${d.inventoryItemId}`);
  return { ok: true, id: result[1].id };
}
