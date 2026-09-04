import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { ok, err, type Outcome, type PublishResult } from "./types";
import type { IgBusinessDiscovery, IgComment, IgMedia } from "@/server/social/instagram";

const GRAPH = "https://graph.facebook.com/v21.0";

async function metaFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<Outcome<T>> {
  if (!env.META_ACCESS_TOKEN) {
    return err("meta.unconfigured", "META_ACCESS_TOKEN is not set");
  }
  try {
    const url = new URL(`${GRAPH}${path}`);
    url.searchParams.set("access_token", env.META_ACCESS_TOKEN);
    const res = await fetch(url.toString(), init);
    const body = await res.json();
    if (!res.ok || body.error) {
      return err(
        `meta.${body?.error?.code ?? res.status}`,
        body?.error?.message ?? "Meta API error",
        (body?.error?.is_transient as boolean) ?? false,
        body,
      );
    }
    return ok(body as T);
  } catch (e) {
    return err(
      "meta.network",
      e instanceof Error ? e.message : "Network error",
      true,
      e,
    );
  }
}

/**
 * Two-step Instagram Graph publish:
 * 1) POST /{ig-business-id}/media — returns a creation_id
 * 2) POST /{ig-business-id}/media_publish — with creation_id
 */
export async function publishInstagramImage(
  imageUrl: string,
  caption: string,
): Promise<Outcome<PublishResult>> {
  const igId = env.META_INSTAGRAM_BUSINESS_ID;
  if (!igId) return err("meta.no_ig", "META_INSTAGRAM_BUSINESS_ID not set");

  const create = await metaFetch<{ id: string }>(
    `/${igId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}`,
    { method: "POST" },
  );
  if (!create.ok) return create;

  const publish = await metaFetch<{ id: string }>(
    `/${igId}/media_publish?creation_id=${create.value.id}`,
    { method: "POST" },
  );
  if (!publish.ok) return publish;

  return ok({
    externalPostId: publish.value.id,
    externalUrl: `https://www.instagram.com/p/${publish.value.id}`,
    publishedAt: new Date(),
    raw: publish.value,
  });
}

export async function publishFacebookPost(
  message: string,
  linkUrl?: string,
): Promise<Outcome<PublishResult>> {
  const pageId = env.META_FACEBOOK_PAGE_ID;
  if (!pageId) return err("meta.no_page", "META_FACEBOOK_PAGE_ID not set");

  const params = new URLSearchParams({ message });
  if (linkUrl) params.set("link", linkUrl);

  const res = await metaFetch<{ id: string }>(
    `/${pageId}/feed?${params.toString()}`,
    { method: "POST" },
  );
  if (!res.ok) return res;
  return ok({
    externalPostId: res.value.id,
    externalUrl: `https://facebook.com/${res.value.id}`,
    publishedAt: new Date(),
    raw: res.value,
  });
}

export async function getInsights(
  metric: "page_impressions" | "page_engaged_users" = "page_impressions",
) {
  const pageId = env.META_FACEBOOK_PAGE_ID;
  if (!pageId) return err("meta.no_page", "META_FACEBOOK_PAGE_ID not set");
  return metaFetch(`/${pageId}/insights?metric=${metric}&period=day`);
}

// ─────────────────────────────────────────────────────────────────
// Instagram scouting — business discovery, tags, mentions
// Requires an Instagram Business/Creator account linked to a Facebook
// Page, plus META_ACCESS_TOKEN and META_INSTAGRAM_BUSINESS_ID.
// ─────────────────────────────────────────────────────────────────

export function instagramConfigured(): boolean {
  return Boolean(env.META_ACCESS_TOKEN && env.META_INSTAGRAM_BUSINESS_ID);
}

const MEDIA_FIELDS =
  "id,caption,media_type,permalink,timestamp,username,like_count,comments_count";

/**
 * Public profile + recent posts for any Business/Creator account, by
 * username. Personal accounts return a Graph error (code 110).
 */
export async function discoverInstagramAccount(
  username: string,
): Promise<Outcome<IgBusinessDiscovery>> {
  const igId = env.META_INSTAGRAM_BUSINESS_ID;
  if (!igId) return err("meta.no_ig", "META_INSTAGRAM_BUSINESS_ID not set");
  const fields =
    `business_discovery.username(${username})` +
    `{username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url,` +
    `media.limit(12){${MEDIA_FIELDS}}}`;
  const r = await metaFetch<{ business_discovery?: IgBusinessDiscovery }>(
    `/${igId}?fields=${encodeURIComponent(fields)}`,
  );
  if (!r.ok) return r;
  if (!r.value.business_discovery) {
    return err("meta.not_found", "No Business or Creator account with that username.");
  }
  return ok(r.value.business_discovery);
}

/** Media in which the connected account has been tagged (photo/video tags). */
export async function fetchTaggedMedia(limit = 50): Promise<Outcome<IgMedia[]>> {
  const igId = env.META_INSTAGRAM_BUSINESS_ID;
  if (!igId) return err("meta.no_ig", "META_INSTAGRAM_BUSINESS_ID not set");
  const r = await metaFetch<{ data?: IgMedia[] }>(
    `/${igId}/tags?fields=${encodeURIComponent(MEDIA_FIELDS)}&limit=${limit}`,
  );
  if (!r.ok) return r;
  return ok(r.value.data ?? []);
}

/** A post whose caption @mentions the connected account (id comes from the webhook). */
export async function fetchMentionedMedia(mediaId: string): Promise<Outcome<IgMedia | null>> {
  const igId = env.META_INSTAGRAM_BUSINESS_ID;
  if (!igId) return err("meta.no_ig", "META_INSTAGRAM_BUSINESS_ID not set");
  const fields = `mentioned_media.media_id(${mediaId}){${MEDIA_FIELDS}}`;
  const r = await metaFetch<{ mentioned_media?: IgMedia }>(
    `/${igId}?fields=${encodeURIComponent(fields)}`,
  );
  if (!r.ok) return r;
  return ok(r.value.mentioned_media ?? null);
}

/** A comment that @mentions the connected account (id comes from the webhook). */
export async function fetchMentionedComment(
  commentId: string,
): Promise<Outcome<IgComment | null>> {
  const igId = env.META_INSTAGRAM_BUSINESS_ID;
  if (!igId) return err("meta.no_ig", "META_INSTAGRAM_BUSINESS_ID not set");
  const fields =
    `mentioned_comment.comment_id(${commentId})` +
    `{id,text,timestamp,username,like_count,media{id,permalink}}`;
  const r = await metaFetch<{ mentioned_comment?: IgComment }>(
    `/${igId}?fields=${encodeURIComponent(fields)}`,
  );
  if (!r.ok) return r;
  return ok(r.value.mentioned_comment ?? null);
}

/** Validate X-Hub-Signature-256 on a raw webhook body using the app secret. */
export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  if (!env.META_APP_SECRET || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", env.META_APP_SECRET).update(rawBody, "utf8").digest("hex");
  const given = header.slice("sha256=".length);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}
