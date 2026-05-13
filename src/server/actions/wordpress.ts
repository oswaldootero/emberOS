"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { marked } from "marked";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { publishArticle, isConfigured } from "@/server/integrations/wordpress";

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
    scheduledFor: z.string().optional(), // ISO datetime
    yoastTitle: z.string().max(80).optional(),
    yoastDescription: z.string().max(160).optional(),
    yoastFocusKeyword: z.string().max(80).optional(),
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
  const contentHtml =
    d.bodyFormat === "markdown" ? await marked.parse(d.body) : d.body;

  const result = await publishArticle({
    title: d.title,
    contentHtml: typeof contentHtml === "string" ? contentHtml : String(contentHtml),
    excerpt: d.excerpt,
    slug: d.slug || undefined,
    status: d.status,
    date: d.status === "future" ? d.scheduledFor : undefined,
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
    diff: { title: d.title, status: d.status, slug: d.slug },
  });

  revalidatePath("/wordpress");
  return {
    ok: true,
    postId: result.value.externalPostId,
    url: result.value.externalUrl ?? "",
  };
}
