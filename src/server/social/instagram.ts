/**
 * Pure Instagram helpers — no network, no database. The Meta client
 * (src/server/integrations/meta.ts) fetches; these shape the results.
 */

export type IgMedia = {
  id: string;
  caption?: string | null;
  media_type?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  username?: string | null;
  like_count?: number | null;
  comments_count?: number | null;
};

export type IgBusinessDiscovery = {
  username: string;
  name?: string | null;
  biography?: string | null;
  website?: string | null;
  followers_count?: number | null;
  follows_count?: number | null;
  media_count?: number | null;
  profile_picture_url?: string | null;
  media?: { data?: IgMedia[] } | null;
};

export type IgProfileSummary = {
  handle: string;
  name: string;
  bio: string | null;
  website: string | null;
  profileUrl: string;
  profilePictureUrl: string | null;
  followerCount: number | null;
  followingCount: number | null;
  postCount: number | null;
  /** Average (likes + comments) per recent post ÷ followers, as a percent. */
  engagementRate: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  recentPosts: {
    id: string;
    caption: string | null;
    mediaType: string | null;
    permalink: string | null;
    postedAt: string | null;
    likes: number | null;
    comments: number | null;
  }[];
};

/** Strip @, instagram.com/ prefixes, trailing slashes and query strings. */
export function cleanInstagramHandle(input: string | null | undefined): string | null {
  if (!input) return null;
  const h = input
    .trim()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? h : null;
}

export function engagementStats(
  media: IgMedia[],
  followers: number | null | undefined,
): { engagementRate: number | null; avgLikes: number | null; avgComments: number | null } {
  const withCounts = media.filter(
    (m) => typeof m.like_count === "number" || typeof m.comments_count === "number",
  );
  if (withCounts.length === 0) {
    return { engagementRate: null, avgLikes: null, avgComments: null };
  }
  const likes = withCounts.reduce((s, m) => s + (m.like_count ?? 0), 0);
  const comments = withCounts.reduce((s, m) => s + (m.comments_count ?? 0), 0);
  const avgLikes = Math.round(likes / withCounts.length);
  const avgComments = Math.round(comments / withCounts.length);
  const engagementRate =
    followers && followers > 0
      ? Math.round((((likes + comments) / withCounts.length) / followers) * 10000) / 100
      : null;
  return { engagementRate, avgLikes, avgComments };
}

export function summarizeProfile(d: IgBusinessDiscovery): IgProfileSummary {
  const media = d.media?.data ?? [];
  const stats = engagementStats(media, d.followers_count);
  return {
    handle: d.username,
    name: d.name?.trim() || d.username,
    bio: d.biography?.trim() || null,
    website: d.website?.trim() || null,
    profileUrl: `https://instagram.com/${d.username}`,
    profilePictureUrl: d.profile_picture_url ?? null,
    followerCount: d.followers_count ?? null,
    followingCount: d.follows_count ?? null,
    postCount: d.media_count ?? null,
    ...stats,
    recentPosts: media.map((m) => ({
      id: m.id,
      caption: m.caption ?? null,
      mediaType: m.media_type ?? null,
      permalink: m.permalink ?? null,
      postedAt: m.timestamp ?? null,
      likes: m.like_count ?? null,
      comments: m.comments_count ?? null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────
// Mentions
// ─────────────────────────────────────────────────────────────────

export type MentionSource = "TAG" | "CAPTION_MENTION" | "COMMENT_MENTION";

export type MentionRecord = {
  source: MentionSource;
  externalId: string;
  mediaId: string | null;
  username: string;
  caption: string | null;
  permalink: string | null;
  mediaType: string | null;
  likeCount: number | null;
  commentCount: number | null;
  postedAt: Date;
  raw: unknown;
};

export function mentionExternalId(source: MentionSource, id: string): string {
  return `${source}:${id}`;
}

export function mentionFromMedia(source: "TAG" | "CAPTION_MENTION", m: IgMedia): MentionRecord | null {
  if (!m.id || !m.username) return null;
  const postedAt = m.timestamp ? new Date(m.timestamp) : new Date();
  return {
    source,
    externalId: mentionExternalId(source, m.id),
    mediaId: m.id,
    username: m.username,
    caption: m.caption ?? null,
    permalink: m.permalink ?? null,
    mediaType: m.media_type ?? null,
    likeCount: m.like_count ?? null,
    commentCount: m.comments_count ?? null,
    postedAt: isNaN(postedAt.getTime()) ? new Date() : postedAt,
    raw: m,
  };
}

export type IgComment = {
  id: string;
  text?: string | null;
  timestamp?: string | null;
  username?: string | null;
  like_count?: number | null;
  media?: { id?: string; permalink?: string | null } | null;
};

export function mentionFromComment(c: IgComment): MentionRecord | null {
  if (!c.id || !c.username) return null;
  const postedAt = c.timestamp ? new Date(c.timestamp) : new Date();
  return {
    source: "COMMENT_MENTION",
    externalId: mentionExternalId("COMMENT_MENTION", c.id),
    mediaId: c.media?.id ?? null,
    username: c.username,
    caption: c.text ?? null,
    permalink: c.media?.permalink ?? null,
    mediaType: "COMMENT",
    likeCount: c.like_count ?? null,
    commentCount: null,
    postedAt: isNaN(postedAt.getTime()) ? new Date() : postedAt,
    raw: c,
  };
}

export type MentionEvent = { mediaId: string; commentId: string | null };

/**
 * Pull the (media_id, comment_id) pairs out of a Meta webhook payload for
 * the Instagram `mentions` field. Tolerates unrelated fields and malformed
 * entries by skipping them.
 */
export function parseMentionWebhook(payload: unknown): MentionEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { object?: string; entry?: unknown };
  if (p.object !== "instagram" || !Array.isArray(p.entry)) return [];
  const out: MentionEvent[] = [];
  for (const entry of p.entry) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const ch of changes) {
      const c = ch as { field?: string; value?: { media_id?: unknown; comment_id?: unknown } };
      if (c.field !== "mentions") continue;
      const mediaId = c.value?.media_id;
      if (typeof mediaId !== "string" || !mediaId) continue;
      const commentId = c.value?.comment_id;
      out.push({ mediaId, commentId: typeof commentId === "string" && commentId ? commentId : null });
    }
  }
  return out;
}
