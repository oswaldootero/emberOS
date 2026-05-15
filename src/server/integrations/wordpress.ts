import { env } from "@/lib/env";
import { ok, err, type Outcome, type PublishResult } from "./types";

export type WPArticleInput = {
  title: string;
  contentHtml: string;
  excerpt?: string;
  slug?: string;
  status?: "draft" | "publish" | "future" | "pending";
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

export type WPPost = {
  id: number;
  title: string;
  status: "publish" | "draft" | "future" | "pending" | "private" | "trash";
  link: string;
  date: string; // ISO
  modified: string;
  slug: string;
  excerpt: string;
  authorId: number;
};

export function isConfigured(): boolean {
  return Boolean(
    env.WORDPRESS_URL && env.WORDPRESS_USERNAME && env.WORDPRESS_APP_PASSWORD,
  );
}

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
      // Don't cache reads — WP posts change
      cache: "no-store",
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

/**
 * Lightweight connection check. Hits the public `/` endpoint of wp-json which
 * doesn't require auth — but going through wp() ensures the URL is reachable.
 */
export async function ping(): Promise<
  Outcome<{ name: string; description: string; url: string }>
> {
  if (!env.WORDPRESS_URL) {
    return err("wp.unconfigured", "WORDPRESS_URL not set");
  }
  try {
    const res = await fetch(`${env.WORDPRESS_URL}/wp-json/`, {
      cache: "no-store",
    });
    const body = await res.json();
    if (!res.ok) {
      return err(
        `wp.ping.${res.status}`,
        "Could not reach WordPress site",
        true,
      );
    }
    return ok({
      name: body.name ?? "",
      description: body.description ?? "",
      url: body.url ?? env.WORDPRESS_URL,
    });
  } catch (e) {
    return err(
      "wp.ping.network",
      e instanceof Error ? e.message : "Network error",
      true,
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
      body: new Uint8Array(buffer),
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

type RawWPPost = {
  id: number;
  title: { rendered: string };
  status: WPPost["status"];
  link: string;
  date: string;
  modified: string;
  slug: string;
  excerpt: { rendered: string };
  author: number;
};

function normalize(raw: RawWPPost): WPPost {
  return {
    id: raw.id,
    title: stripHtml(raw.title.rendered),
    status: raw.status,
    link: raw.link,
    date: raw.date,
    modified: raw.modified,
    slug: raw.slug,
    excerpt: stripHtml(raw.excerpt.rendered).slice(0, 200),
    authorId: raw.author,
  };
}

function stripHtml(s: string) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .trim();
}

export async function listPosts(opts: {
  perPage?: number;
  status?: WPPost["status"] | "any";
  after?: Date;
  before?: Date;
} = {}): Promise<Outcome<WPPost[]>> {
  const params = new URLSearchParams({
    per_page: String(opts.perPage ?? 20),
    status: opts.status ?? "any",
    orderby: "date",
    order: "desc",
    _fields: "id,title,status,link,date,modified,slug,excerpt,author",
  });
  if (opts.after) params.set("after", opts.after.toISOString());
  if (opts.before) params.set("before", opts.before.toISOString());
  const r = await wp<RawWPPost[]>(`/wp/v2/posts?${params}`);
  if (!r.ok) return r;
  return ok(r.value.map(normalize));
}

export type WPStats = {
  total: number;
  publish: number;
  draft: number;
  future: number;
  pending: number;
};

/**
 * WordPress doesn't have a single "counts" endpoint, but each list response
 * includes `X-WP-Total` header per status query. We do four parallel HEAD-ish
 * calls (per_page=1 to keep payload tiny) and read the header.
 */
export async function getStats(): Promise<Outcome<WPStats>> {
  if (!env.WORDPRESS_URL) return err("wp.unconfigured", "WORDPRESS_URL not set");

  const statuses: (keyof WPStats)[] = [
    "publish",
    "draft",
    "future",
    "pending",
  ];

  try {
    const results = await Promise.all(
      statuses.map(async (status) => {
        const res = await fetch(
          `${env.WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=1&status=${status}&_fields=id`,
          {
            headers: { Authorization: basicAuth() },
            cache: "no-store",
          },
        );
        if (!res.ok) return 0;
        return Number(res.headers.get("X-WP-Total") ?? 0);
      }),
    );

    const out: WPStats = {
      publish: results[0],
      draft: results[1],
      future: results[2],
      pending: results[3],
      total: results.reduce((a, b) => a + b, 0),
    };
    return ok(out);
  } catch (e) {
    return err(
      "wp.stats.network",
      e instanceof Error ? e.message : "Network error",
      true,
    );
  }
}
