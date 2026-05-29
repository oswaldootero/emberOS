"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  uploadFile,
  uploadDataUrl,
  deleteFile,
  isStorageConfigured,
} from "@/server/integrations/storage";
import type { AssetType } from "@prisma/client";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file

export type LibraryResult =
  | {
      ok: true;
      id: string;
      publicUrl: string;
      storagePath: string;
    }
  | { ok: false; error: string };

function inferAssetType(mimeType: string): AssetType {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType === "application/pdf") return "PDF";
  return "GRAPHIC";
}

export async function uploadAsset(formData: FormData): Promise<LibraryResult> {
  const user = await requireUser();

  if (!isStorageConfigured()) {
    return {
      ok: false,
      error:
        "Asset Library not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel.",
    };
  }

  const file = formData.get("file");
  const caption = formData.get("caption");
  const altText = formData.get("altText");

  if (!(file instanceof File)) {
    return { ok: false, error: "No file uploaded." };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `File too big — ${(file.size / 1024 / 1024).toFixed(1)}MB. Limit is 50MB.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "File looks empty." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const uploaded = await uploadFile({
    filename: file.name,
    body: buffer,
    contentType: file.type || "application/octet-stream",
  });
  if (!uploaded.ok) {
    return { ok: false, error: uploaded.error.message };
  }

  const asset = await prisma.asset.create({
    data: {
      filename: file.name,
      storagePath: uploaded.value.storagePath,
      publicUrl: uploaded.value.publicUrl,
      mimeType: file.type || "application/octet-stream",
      byteSize: uploaded.value.byteSize,
      type: inferAssetType(file.type || ""),
      altText: typeof altText === "string" && altText ? altText : null,
      caption: typeof caption === "string" && caption ? caption : null,
      uploadedById: user.id,
    },
  });

  await audit("library.upload", {
    actorId: user.id,
    entityType: "Asset",
    entityId: asset.id,
    diff: { filename: file.name, byteSize: file.size, mime: file.type },
  });

  revalidatePath("/library");
  return {
    ok: true,
    id: asset.id,
    publicUrl: uploaded.value.publicUrl,
    storagePath: uploaded.value.storagePath,
  };
}

/**
 * Save an AI-generated image (base64 data URL) directly to the library.
 * Used by the AI image generator's "Save to library" button.
 */
export async function saveGeneratedImage(
  dataUrl: string,
  prompt: string,
): Promise<LibraryResult> {
  const user = await requireUser();

  if (!isStorageConfigured()) {
    return {
      ok: false,
      error: "Asset Library not configured.",
    };
  }

  const result = await uploadDataUrl(dataUrl, "ai-image");
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  const asset = await prisma.asset.create({
    data: {
      filename: result.value.storagePath.split("/").pop() ?? "ai-image.png",
      storagePath: result.value.storagePath,
      publicUrl: result.value.publicUrl,
      mimeType: result.value.contentType,
      byteSize: result.value.byteSize,
      type: "IMAGE",
      caption: prompt.slice(0, 280),
      tags: ["ai-generated"],
      uploadedById: user.id,
    },
  });

  await audit("library.save_generated", {
    actorId: user.id,
    entityType: "Asset",
    entityId: asset.id,
    diff: { promptLength: prompt.length },
  });

  revalidatePath("/library");
  return {
    ok: true,
    id: asset.id,
    publicUrl: result.value.publicUrl,
    storagePath: result.value.storagePath,
  };
}

export async function deleteAsset(assetId: string): Promise<LibraryResult> {
  const user = await requireUser();
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { ok: false, error: "Asset not found." };

  if (asset.uploadedById !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "Only the uploader or an admin can delete." };
  }

  const removed = await deleteFile(asset.storagePath);
  if (!removed.ok) {
    // Storage delete failed but we still remove the DB record so it
    // disappears from the library — storage will eventually GC orphans.
    console.error("[library.delete] storage delete failed:", removed.error);
  }

  await prisma.asset.delete({ where: { id: assetId } });

  await audit("library.delete", {
    actorId: user.id,
    entityType: "Asset",
    entityId: assetId,
    diff: { filename: asset.filename },
  });

  revalidatePath("/library");
  return {
    ok: true,
    id: assetId,
    publicUrl: "",
    storagePath: "",
  };
}

export async function updateAssetMetadata(
  assetId: string,
  fields: { caption?: string; altText?: string; tags?: string[] },
): Promise<LibraryResult> {
  const user = await requireUser();
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return { ok: false, error: "Asset not found." };

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      caption: fields.caption ?? asset.caption,
      altText: fields.altText ?? asset.altText,
      tags: fields.tags ?? asset.tags,
    },
  });

  await audit("library.update_metadata", {
    actorId: user.id,
    entityType: "Asset",
    entityId: assetId,
    diff: fields,
  });
  revalidatePath("/library");
  return {
    ok: true,
    id: assetId,
    publicUrl: asset.publicUrl ?? "",
    storagePath: asset.storagePath,
  };
}
