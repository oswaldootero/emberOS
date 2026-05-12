import { env } from "@/lib/env";
import { ok, err, type Outcome, type PublishResult } from "./types";

export type WPArticleInput = {
  title: string;
  contentHtml: string;
  excerpt?: string;
  slug?: string;
  status?: "draft" | "publish" | "future";
  date?: string; // ISO — used when status=future
  categories?: number[];
  tags?: number[];
  featuredMediaId?: number;
  yoastMeta?: {
    title?: string;
    description?: string;
    focusKeyword?: string;
  };
};

function basicAuth() {
  if (!env.WORDPRESS_USERNAME || !env.WORDPRESS_APP_PASSWORD) {
    throw new Error("WordPress credentials are not configured");
  }
  const token = Buffer.from(
    `${env.WORDPRESS_USERNAME}:${env.WORDPRESS_APP_PASSWORD}`,
  ).toString("base64");
  return `Basic ${token}`;
}

async function wp<T>(
  path: string,
  init: RequestInit = {},
): Promise<Outcome<T>> {
  if (!env.WORDPRESS_URL) {
    return err("wp.unconfigured", "WORDPRESS_URL is not set");
  }
  try {
    const res = await fetch(`${env.WORDPRESS_URL}/wp-json${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuth(),
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      return err(
        `wp.${res.status}`,
        body?.message ?? `WordPress request failed (${res.status})`,
        res.status >= 500,
        body,
      );
    }
    return ok(body as T);
  } catch (e) {
    return err(
      "wp.network",
      e instanceof Error ? e.message : "Network error",
      true,
      e,
    );
  }
}

export async function publishArticle(
  input: WPArticleInput,
): Promise<Outcome<PublishResult>> {
  const payload: Record<string, unknown> = {
    title: input.title,
    content: input.contentHtml,
    excerpt: input.excerpt,
    slug: input.slug,
    status: input.status ?? "draft",
    categories: input.categories,
    tags: input.tags,
    featured_media: input.featuredMediaId,
    date: input.date,
    // Yoast SEO meta via REST (requires Yoast SEO REST extension or custom field)
    meta: input.yoastMeta
      ? {
          _yoast_wpseo_title: input.yoastMeta.title,
          _yoast_wpseo_metadesc: input.yoastMeta.description,
          _yoast_wpseo_focuskw: input.yoastMeta.focusKeyword,
        }
      : undefined,
  };

  const result = await wp<{ id: number; link: string; date: string }>(
    "/wp/v2/posts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!result.ok) return result;
  return ok({
    externalPostId: String(result.value.id),
    externalUrl: result.value.link,
    publishedAt: new Date(result.value.date),
    raw: result.value,
  });
}

export async function uploadFeaturedImage(
  filename: string,
  buffer: Buffer,
  mimeType: string,
): Promise<Outcome<{ id: number; url: string }>> {
  if (!env.WORDPRESS_URL) return err("wp.unconfigured", "WORDPRESS_URL not set");
  try {
    const res = await fetch(`${env.WORDPRESS_URL}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        Authorization: basicAuth(),
      },
      body: buffer,
    });
    const body = await res.json();
    if (!res.ok) {
      return err("wp.media", body?.message ?? "Media upload failed", false, body);
    }
    return ok({ id: body.id, url: body.source_url });
  } catch (e) {
    return err(
      "wp.media.network",
      e instanceof Error ? e.message : "Network error",
      true,
      e,
    );
  }
}

export async function listRecentPosts(perPage = 10) {
  return wp<unknown[]>(`/wp/v2/posts?per_page=${perPage}&_fields=id,title,status,link,date`);
}
