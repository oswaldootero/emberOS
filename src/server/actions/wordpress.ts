"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { marked } from "marked";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { fireTrigger } from "@/server/workflows/engine";
import {
  publishArticle,
  isConfigured,
  uploadFeaturedImage,
} from "@/server/integrations/wordpress";

const PublishSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(20),
    bodyFormat: z.enum(["markdown", "html"]).default("markdown"),
    excerpt: z.string().max(500).optional(),
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9-]*$/i, "Slug can only contain letters, numbers, hyphens")
      .optional(),
    status: z.enum(["draft", "publish", "future"]).default("draft"),
    scheduledFor: z.string().optional(),
    yoastTitle: z.string().max(80).optional(),
    yoastDescription: z.string().max(160).optional(),
    yoastFocusKeyword: z.string().max(80).optional(),
    /** Base64 data URL (data:image/png;base64,...) — uploaded to WP and attached as featured media */
    featuredImageDataUrl: z
      .string()
      .startsWith("data:image/")
      .optional(),
    featuredImageAlt: z.string().max(180).optional(),
  })
  .refine(
    (v) => v.status !== "future" || (v.scheduledFor && v.scheduledFor.length > 0),
    {
      message: "Scheduled posts need a scheduledFor date",
      path: ["scheduledFor"],
    },
  );

export type PublishResult =
  | { ok: true; postId: string; url: string }
  | { ok: false; error: string };

export async function publishToWordPress(
  input: unknown,
): Promise<PublishResult> {
  const user = await requireUser();
  if (!isConfigured()) {
    return {
      ok: false,
      error: "WordPress is not connected. Configure env vars first.",
    };
  }

  const parsed = PublishSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }

  const d = parsed.data;

  // If a generated image was attached, upload it to WP media first
  let featuredMediaId: number | undefined;
  if (d.featuredImageDataUrl) {
    const upload = await uploadDataUrlAsFeaturedMedia(
      d.featuredImageDataUrl,
      d.title,
    );
    if (!upload.ok) {
      // Don't fail the whole publish on image upload error — fall through with a warning toast
      console.error("[wp.publish] featured image upload failed:", upload.error);
    } else {
      featuredMediaId = upload.mediaId;
    }
  }

  const contentHtml =
    d.bodyFormat === "markdown" ? await marked.parse(d.body) : d.body;

  const result = await publishArticle({
    title: d.title,
    contentHtml: typeof contentHtml === "string" ? contentHtml : String(contentHtml),
    excerpt: d.excerpt,
    slug: d.slug || undefined,
    status: d.status,
    date: d.status === "future" ? d.scheduledFor : undefined,
    featuredMediaId,
    yoastMeta: {
      title: d.yoastTitle,
      description: d.yoastDescription,
      focusKeyword: d.yoastFocusKeyword,
    },
  });

  if (!result.ok) {
    await audit("wordpress.publish_failed", {
      actorId: user.id,
      diff: { title: d.title, error: result.error.code },
    });
    return { ok: false, error: result.error.message };
  }

  await audit("wordpress.publish", {
    actorId: user.id,
    entityType: "WordPressPost",
    entityId: result.value.externalPostId,
    diff: {
      title: d.title,
      status: d.status,
      slug: d.slug,
      hasFeaturedImage: Boolean(featuredMediaId),
    },
  });

  // Only fire CONTENT_PUBLISHED workflows when the post actually went live —
  // not for drafts or scheduled posts (those fire when WP publishes them)
  if (d.status === "publish") {
    fireTrigger("CONTENT_PUBLISHED", {
      source: "wordpress",
      title: d.title,
      excerpt: d.excerpt ?? "",
      url: result.value.externalUrl ?? "",
      externalUrl: result.value.externalUrl ?? "",
      externalPostId: result.value.externalPostId,
      slug: d.slug,
    }).catch((e) =>
      console.error("[wordpress.publish] workflow trigger failed:", e),
    );
  }

  revalidatePath("/wordpress");
  return {
    ok: true,
    postId: result.value.externalPostId,
    url: result.value.externalUrl ?? "",
  };
}

async function uploadDataUrlAsFeaturedMedia(
  dataUrl: string,
  title: string,
): Promise<{ ok: true; mediaId: number } | { ok: false; error: string }> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return { ok: false, error: "Invalid image data URL" };
  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  const ext = mimeType.split("/")[1]?.replace("+xml", "") ?? "png";
  const safeTitle =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "emberos-hero";

  const result = await uploadFeaturedImage(
    `${safeTitle}-${Date.now()}.${ext}`,
    buffer,
    mimeType,
  );
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, mediaId: result.value.id };
}
