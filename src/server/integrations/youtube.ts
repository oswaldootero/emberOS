import { env } from "@/lib/env";
import { ok, err, type Outcome } from "./types";

/**
 * Read-only YouTube Data API helpers. Uploading video requires OAuth user
 * consent — handled in /api/auth/youtube/callback (out of scope for v0.1).
 */

const API = "https://www.googleapis.com/youtube/v3";

async function yt<T>(path: string, params: Record<string, string>): Promise<Outcome<T>> {
  if (!env.YOUTUBE_API_KEY) {
    return err("yt.unconfigured", "YOUTUBE_API_KEY not set");
  }
  try {
    const url = new URL(`${API}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set("key", env.YOUTUBE_API_KEY);
    const res = await fetch(url.toString());
    const body = await res.json();
    if (!res.ok) {
      return err(
        `yt.${res.status}`,
        body?.error?.message ?? "YouTube API error",
        res.status >= 500,
        body,
      );
    }
    return ok(body as T);
  } catch (e) {
    return err(
      "yt.network",
      e instanceof Error ? e.message : "Network error",
      true,
      e,
    );
  }
}

export async function getChannelStats() {
  const channelId = env.YOUTUBE_CHANNEL_ID;
  if (!channelId) return err("yt.no_channel", "YOUTUBE_CHANNEL_ID not set");
  return yt(`/channels`, {
    part: "snippet,statistics",
    id: channelId,
  });
}

export async function getRecentVideos(maxResults = 10) {
  const channelId = env.YOUTUBE_CHANNEL_ID;
  if (!channelId) return err("yt.no_channel", "YOUTUBE_CHANNEL_ID not set");
  return yt(`/search`, {
    part: "snippet",
    channelId,
    type: "video",
    order: "date",
    maxResults: String(maxResults),
  });
}
