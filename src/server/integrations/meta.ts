import { env } from "@/lib/env";
import { ok, err, type Outcome, type PublishResult } from "./types";

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
