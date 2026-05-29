import "server-only";
import { supabaseAdmin, isAdminConfigured } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { ok, err, type Outcome } from "./types";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "emberos-assets";

export function storageBucket() {
  return BUCKET;
}

export function isStorageConfigured(): boolean {
  return isAdminConfigured();
}

/**
 * Ensure the EmberOS bucket exists. Safe to call repeatedly — only creates
 * if missing. We make it PUBLIC so generated image URLs can be embedded
 * directly in WordPress posts / Instagram captions / external dashboards.
 */
export async function ensureBucket(): Promise<Outcome<{ created: boolean }>> {
  try {
    const sb = supabaseAdmin();
    const { data: existing } = await sb.storage.getBucket(BUCKET);
    if (existing) return ok({ created: false });

    const { error } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024, // 100 MB
    });
    if (error) {
      return err("storage.create_failed", error.message, false, error);
    }
    return ok({ created: true });
  } catch (e) {
    return err(
      "storage.unconfigured",
      e instanceof Error ? e.message : "Storage admin not configured",
      false,
    );
  }
}

export type UploadInput = {
  filename: string;
  /** node Buffer or Uint8Array — file binary */
  body: Buffer | Uint8Array;
  contentType: string;
  /** Optional folder prefix; defaults to year/month so uploads stay organized */
  folder?: string;
};

export type UploadResult = {
  storagePath: string;
  publicUrl: string;
  byteSize: number;
};

export async function uploadFile(
  input: UploadInput,
): Promise<Outcome<UploadResult>> {
  if (!isAdminConfigured()) {
    return err(
      "storage.unconfigured",
      "Set SUPABASE_SERVICE_ROLE_KEY in Vercel to enable uploads.",
      false,
    );
  }
  const sb = supabaseAdmin();

  // Ensure bucket exists (idempotent)
  const ensured = await ensureBucket();
  if (!ensured.ok) return ensured;

  const safe = sanitizeFilename(input.filename);
  const folder = input.folder ?? defaultFolder();
  const storagePath = `${folder}/${Date.now()}-${safe}`;

  const buffer = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) {
    return err("storage.upload_failed", error.message, true, error);
  }

  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath);

  return ok({
    storagePath,
    publicUrl: pub.publicUrl,
    byteSize: buffer.byteLength,
  });
}

/**
 * Decode a base64 data URL (data:image/png;base64,...) and upload it.
 * Convenience helper for storing AI-generated images.
 */
export async function uploadDataUrl(
  dataUrl: string,
  filenamePrefix = "ai-image",
): Promise<Outcome<UploadResult & { contentType: string }>> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    return err("storage.invalid_data_url", "Not a base64 image data URL", false);
  }
  const [, contentType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  const ext = contentType.split("/")[1]?.replace("+xml", "") ?? "png";

  const result = await uploadFile({
    filename: `${filenamePrefix}-${Date.now()}.${ext}`,
    body: buffer,
    contentType,
  });
  if (!result.ok) return result;
  return ok({ ...result.value, contentType });
}

export async function deleteFile(storagePath: string): Promise<Outcome<true>> {
  if (!isAdminConfigured()) {
    return err("storage.unconfigured", "Storage admin not configured", false);
  }
  const sb = supabaseAdmin();
  const { error } = await sb.storage.from(BUCKET).remove([storagePath]);
  if (error) return err("storage.delete_failed", error.message, true, error);
  return ok(true);
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function defaultFolder(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// keep env reference so lint doesn't drop the import on unused-detection
void env;
