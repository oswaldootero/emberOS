import { prisma } from "@/lib/prisma";
import * as telegram from "@/server/integrations/telegram";
import * as meta from "@/server/integrations/meta";
import * as wordpress from "@/server/integrations/wordpress";

/**
 * Pulls a ScheduledPost and dispatches to the right platform integration.
 * Idempotent: marks the post as PROCESSING up front to prevent double-publishes
 * if QStash retries.
 */
export async function executeScheduledPost(scheduledPostId: string) {
  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: { content: true },
  });
  if (!post) throw new Error(`ScheduledPost ${scheduledPostId} not found`);

  if (post.status === "PUBLISHED") return; // already done

  await prisma.scheduledPost.update({
    where: { id: post.id },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  try {
    const result = await dispatch(post.platform, post.payload, post.content?.body ?? "");

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: "PUBLISHED",
        externalPostId: result.externalPostId,
        externalUrl: result.externalUrl,
        publishedAt: result.publishedAt,
        errorMessage: null,
      },
    });
    if (post.contentId) {
      await prisma.contentPiece.update({
        where: { id: post.contentId },
        data: { status: "PUBLISHED", publishedAt: result.publishedAt },
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw e;
  }
}

async function dispatch(
  platform: string,
  payload: unknown,
  fallbackText: string,
) {
  const p = payload as Record<string, unknown> | null;
  switch (platform) {
    case "TELEGRAM": {
      const text = (p?.text as string) ?? fallbackText;
      const r = await telegram.sendMessage({ text });
      if (!r.ok) throw new Error(`Telegram: ${r.error.message}`);
      return r.value;
    }
    case "INSTAGRAM": {
      const imageUrl = p?.imageUrl as string | undefined;
      const caption = (p?.caption as string) ?? fallbackText;
      if (!imageUrl) throw new Error("Instagram publish requires imageUrl");
      const r = await meta.publishInstagramImage(imageUrl, caption);
      if (!r.ok) throw new Error(`Instagram: ${r.error.message}`);
      return r.value;
    }
    case "FACEBOOK": {
      const message = (p?.message as string) ?? fallbackText;
      const r = await meta.publishFacebookPost(message, p?.link as string);
      if (!r.ok) throw new Error(`Facebook: ${r.error.message}`);
      return r.value;
    }
    case "WORDPRESS": {
      const r = await wordpress.publishArticle({
        title: (p?.title as string) ?? "Untitled",
        contentHtml: (p?.contentHtml as string) ?? fallbackText,
        status: "publish",
        slug: p?.slug as string | undefined,
        excerpt: p?.excerpt as string | undefined,
      });
      if (!r.ok) throw new Error(`WordPress: ${r.error.message}`);
      return r.value;
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
