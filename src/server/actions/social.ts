"use server";

import { revalidatePath } from "next/cache";
import type { SocialMentionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  discoverInstagramAccount,
  instagramConfigured,
} from "@/server/integrations/meta";
import {
  cleanInstagramHandle,
  mentionExternalId,
  parseInstagramUrl,
  summarizeProfile,
  type IgProfileSummary,
  type MentionRecord,
} from "@/server/social/instagram";
import { syncTaggedMedia, upsertMentions } from "@/server/social/sync";

export type SocialResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const NOT_CONFIGURED =
  "Instagram isn't connected yet. Add META_ACCESS_TOKEN and META_INSTAGRAM_BUSINESS_ID — see docs/SOCIAL-SCOUTING.md.";

function friendlyMetaError(code: string, message: string): string {
  if (code === "meta.110" || code === "meta.not_found") {
    return "That username isn't a Business or Creator account (or doesn't exist). Only those can be looked up.";
  }
  if (code === "meta.190") return "The Meta access token has expired — generate a new one.";
  if (code === "meta.4" || code === "meta.17" || code === "meta.32") {
    return "Meta rate limit reached — try again in a few minutes.";
  }
  return message;
}

function revalidateSocial(influencerId?: string | null) {
  revalidatePath("/social/mentions");
  revalidatePath("/influencers");
  if (influencerId) revalidatePath(`/influencers/${influencerId}`);
}

async function discover(handleInput: string): Promise<SocialResult<{ profile: IgProfileSummary }>> {
  if (!instagramConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const handle = cleanInstagramHandle(handleInput);
  if (!handle) return { ok: false, error: "Enter a valid Instagram username." };
  const r = await discoverInstagramAccount(handle);
  if (!r.ok) return { ok: false, error: friendlyMetaError(r.error.code, r.error.message) };
  return { ok: true, profile: summarizeProfile(r.value) };
}

// ─────────────────────────────────────────────────────────────────
// Handle lookup
// ─────────────────────────────────────────────────────────────────

export async function lookupInstagramHandle(
  handleInput: string,
): Promise<SocialResult<{ profile: IgProfileSummary; existing: { id: string; name: string } | null }>> {
  await requireUser();
  const d = await discover(handleInput);
  if (!d.ok) return d;
  const existing = await prisma.influencer.findFirst({
    where: { handle: { equals: d.profile.handle, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  return { ok: true, profile: d.profile, existing };
}

function lookupNotes(p: IgProfileSummary): string {
  const bits = [
    p.engagementRate != null ? `Engagement ${p.engagementRate}%` : null,
    p.avgLikes != null ? `avg ${p.avgLikes.toLocaleString()} likes` : null,
    p.avgComments != null ? `avg ${p.avgComments.toLocaleString()} comments` : null,
    p.website ? `Website: ${p.website}` : null,
  ].filter(Boolean);
  return `From Instagram lookup ${new Date().toLocaleDateString("en-US")}: ${bits.join(" · ")}`;
}

export async function createInfluencerFromInstagram(
  handleInput: string,
): Promise<SocialResult<{ id: string }>> {
  const user = await requireUser();
  const d = await discover(handleInput);
  if (!d.ok) return d;
  const p = d.profile;

  const dupe = await prisma.influencer.findFirst({
    where: { handle: { equals: p.handle, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (dupe) return { ok: false, error: `${dupe.name} is already on the roster.` };

  const inf = await prisma.influencer.create({
    data: {
      name: p.name,
      handle: p.handle,
      platform: "Instagram",
      profileUrl: p.profileUrl,
      followerCount: p.followerCount,
      followingCount: p.followingCount,
      postCount: p.postCount,
      bio: p.bio,
      tags: ["instagram-lookup"],
      notes: lookupNotes(p),
    },
  });
  await audit("influencers.created", {
    actorId: user.id,
    entityType: "Influencer",
    entityId: inf.id,
    diff: { via: "instagram-lookup", handle: p.handle },
  });
  // Connect any mentions we already hold from this handle.
  await prisma.socialMention.updateMany({
    where: { username: { equals: p.handle, mode: "insensitive" }, influencerId: null },
    data: { influencerId: inf.id },
  });
  revalidateSocial(inf.id);
  return { ok: true, id: inf.id };
}

export async function refreshInfluencerFromInstagram(
  influencerId: string,
): Promise<SocialResult<{ followerCount: number | null; engagementRate: number | null }>> {
  const user = await requireUser();
  const inf = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: { id: true, handle: true, followerCount: true, platform: true },
  });
  if (!inf) return { ok: false, error: "Influencer not found." };
  if (!inf.handle) return { ok: false, error: "Add their Instagram handle first." };
  const d = await discover(inf.handle);
  if (!d.ok) return d;
  const p = d.profile;

  await prisma.influencer.update({
    where: { id: inf.id },
    data: {
      followerCount: p.followerCount,
      followingCount: p.followingCount,
      postCount: p.postCount,
      bio: p.bio ?? undefined,
      profileUrl: p.profileUrl,
      platform: inf.platform || "Instagram",
    },
  });
  await audit("influencers.stats_refreshed", {
    actorId: user.id,
    entityType: "Influencer",
    entityId: inf.id,
    diff: {
      followersBefore: inf.followerCount,
      followersAfter: p.followerCount,
      engagementRate: p.engagementRate,
    },
  });
  revalidateSocial(inf.id);
  return { ok: true, followerCount: p.followerCount, engagementRate: p.engagementRate };
}

// ─────────────────────────────────────────────────────────────────
// Mentions inbox
// ─────────────────────────────────────────────────────────────────

export async function syncMentionsNow(): Promise<
  SocialResult<{ fetched: number; created: number; updated: number }>
> {
  const user = await requireUser();
  if (!instagramConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const r = await syncTaggedMedia();
  if (!r.ok) return { ok: false, error: friendlyMetaError("", r.error) };
  await audit("social.mentions_synced", {
    actorId: user.id,
    diff: { fetched: r.fetched, created: r.created, updated: r.updated },
  });
  revalidateSocial();
  return { ok: true, fetched: r.fetched, created: r.created, updated: r.updated };
}

export async function setMentionStatus(
  mentionId: string,
  status: SocialMentionStatus,
): Promise<SocialResult> {
  await requireUser();
  const m = await prisma.socialMention.update({
    where: { id: mentionId },
    data: { status },
    select: { id: true },
  });
  if (!m) return { ok: false, error: "Mention not found." };
  revalidateSocial();
  return { ok: true };
}

export async function addInfluencerFromMention(
  mentionId: string,
): Promise<SocialResult<{ id: string; created: boolean }>> {
  const user = await requireUser();
  const m = await prisma.socialMention.findUnique({ where: { id: mentionId } });
  if (!m) return { ok: false, error: "Mention not found." };

  // Already tracked under this handle? Just link.
  const existing = await prisma.influencer.findFirst({
    where: { handle: { equals: m.username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    await prisma.socialMention.update({
      where: { id: m.id },
      data: { influencerId: existing.id, status: m.status === "NEW" ? "REVIEWED" : m.status },
    });
    revalidateSocial(existing.id);
    return { ok: true, id: existing.id, created: false };
  }

  // Prefer full profile data when the API is available; fall back to a stub.
  let data: Parameters<typeof prisma.influencer.create>[0]["data"] = {
    name: m.username,
    handle: m.username,
    platform: "Instagram",
    profileUrl: `https://instagram.com/${m.username}`,
    tags: ["instagram-mention"],
    notes: `Found via Instagram mention (${m.source.toLowerCase().replace("_", " ")}) on ${m.postedAt.toLocaleDateString("en-US")}.`,
  };
  if (instagramConfigured()) {
    const r = await discoverInstagramAccount(m.username);
    if (r.ok) {
      const p = summarizeProfile(r.value);
      data = {
        ...data,
        name: p.name,
        followerCount: p.followerCount,
        followingCount: p.followingCount,
        postCount: p.postCount,
        bio: p.bio,
        notes: `${data.notes}\n${lookupNotes(p)}`,
      };
    }
  }

  const inf = await prisma.influencer.create({ data });
  await prisma.socialMention.updateMany({
    where: { username: { equals: m.username, mode: "insensitive" }, influencerId: null },
    data: { influencerId: inf.id },
  });
  await prisma.socialMention.update({ where: { id: m.id }, data: { status: "REVIEWED" } });
  await audit("influencers.created", {
    actorId: user.id,
    entityType: "Influencer",
    entityId: inf.id,
    diff: { via: "instagram-mention", mentionId: m.id },
  });
  revalidateSocial(inf.id);
  return { ok: true, id: inf.id, created: true };
}

export async function addProspectFromMention(
  mentionId: string,
): Promise<SocialResult<{ id: string; created: boolean }>> {
  const user = await requireUser();
  const m = await prisma.socialMention.findUnique({ where: { id: mentionId } });
  if (!m) return { ok: false, error: "Mention not found." };

  const existing = await prisma.prospect.findFirst({
    where: { instagram: { contains: m.username, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    await prisma.socialMention.update({
      where: { id: m.id },
      data: { prospectId: existing.id, status: m.status === "NEW" ? "REVIEWED" : m.status },
    });
    revalidateSocial();
    revalidatePath("/prospects");
    return { ok: true, id: existing.id, created: false };
  }

  const excerpt = m.caption ? ` — "${m.caption.slice(0, 140)}${m.caption.length > 140 ? "…" : ""}"` : "";
  const p = await prisma.prospect.create({
    data: {
      businessName: m.username,
      instagram: `https://instagram.com/${m.username}`,
      tags: ["instagram-mention"],
      notes: `Found via Instagram mention on ${m.postedAt.toLocaleDateString("en-US")}${excerpt}. Rename to the business name once confirmed.`,
    },
  });
  await prisma.socialMention.updateMany({
    where: { username: { equals: m.username, mode: "insensitive" }, prospectId: null },
    data: { prospectId: p.id },
  });
  await prisma.socialMention.update({ where: { id: m.id }, data: { status: "REVIEWED" } });
  await audit("prospects.created", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: p.id,
    diff: { via: "instagram-mention", mentionId: m.id },
  });
  revalidateSocial();
  revalidatePath("/prospects");
  return { ok: true, id: p.id, created: true };
}

export async function logMentionAsPost(
  mentionId: string,
): Promise<SocialResult<{ influencerId: string }>> {
  const user = await requireUser();
  const m = await prisma.socialMention.findUnique({ where: { id: mentionId } });
  if (!m) return { ok: false, error: "Mention not found." };
  if (!m.influencerId) return { ok: false, error: "Add or link an influencer first." };
  if (m.loggedPostId) return { ok: false, error: "Already logged as a post." };

  const post = await prisma.influencerPost.create({
    data: {
      influencerId: m.influencerId,
      postedAt: m.postedAt,
      type: "MENTION",
      url: m.permalink,
      caption: m.caption,
      likes: m.likeCount,
      comments: m.commentCount,
      notes: `Auto-logged from the mentions inbox (${m.source.toLowerCase().replace("_", " ")}).`,
      createdById: user.id,
    },
  });
  await prisma.socialMention.update({
    where: { id: m.id },
    data: { loggedPostId: post.id, status: "REVIEWED" },
  });
  await audit("influencers.post_added", {
    actorId: user.id,
    entityType: "InfluencerPost",
    entityId: post.id,
    diff: { influencerId: m.influencerId, type: "MENTION", via: "mention" },
  });
  revalidateSocial(m.influencerId);
  return { ok: true, influencerId: m.influencerId };
}

// ─────────────────────────────────────────────────────────────────
// Quick capture — no API. Paste a link and/or drop screenshots.
// ─────────────────────────────────────────────────────────────────

export type CapturedMention = {
  username: string | null;
  caption: string | null;
  likes: number | null;
  comments: number | null;
  mediaType: "POST" | "STORY" | "REEL" | "COMMENT" | null;
  postedAt: string | null; // ISO date if visible
  notes: string | null;
};

export type CaptureResult =
  | {
      ok: true;
      mentionId: string;
      username: string;
      /** True when a mention with this link already existed and was refreshed */
      duplicate: boolean;
      influencer: { id: string; name: string } | null;
      prospect: { id: string; name: string } | null;
    }
  | { ok: false; error: string };

async function extractMentionFromScreenshots(files: File[]): Promise<CapturedMention | null> {
  const { openai, MODELS } = await import("@/lib/openai");
  const images = await Promise.all(
    files.map(async (f) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`,
      },
    })),
  );
  try {
    const r = await openai().chat.completions.create({
      model: MODELS.primary(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You read screenshots from the Instagram app for a premium cigar brand (Heaven's Leaf, @heavensleaf). The screenshot shows a post, story, reel, comment, or a notification where someone tagged or mentioned the brand.

Return JSON with exactly these keys (null when not visible — never guess):
username (the OTHER account's @username without the @ — the person who posted or commented, never heavensleaf), caption (the post caption or comment text verbatim, trimmed), likes (integer; expand "1.2K" to 1200), comments (integer), mediaType (one of "POST", "STORY", "REEL", "COMMENT", or null), postedAt (ISO date YYYY-MM-DD if a date or "3d ago"-style hint lets you compute it relative to today ${new Date().toISOString().slice(0, 10)}; else null), notes (anything useful for a partnerships manager: it's a lounge/shop, verified badge, other brands tagged, sentiment — or null).

If no Instagram content is recognizable, return {"username": null}.`,
        },
        {
          role: "user",
          content: [{ type: "text", text: "Extract the mention from these screenshots:" }, ...images],
        },
      ],
    });
    const parsed = JSON.parse(r.choices[0]?.message?.content ?? "{}") as Partial<CapturedMention>;
    return {
      username: typeof parsed.username === "string" ? parsed.username : null,
      caption: typeof parsed.caption === "string" ? parsed.caption : null,
      likes: typeof parsed.likes === "number" ? parsed.likes : null,
      comments: typeof parsed.comments === "number" ? parsed.comments : null,
      mediaType:
        parsed.mediaType && ["POST", "STORY", "REEL", "COMMENT"].includes(parsed.mediaType)
          ? parsed.mediaType
          : null,
      postedAt: typeof parsed.postedAt === "string" ? parsed.postedAt : null,
      notes: typeof parsed.notes === "string" ? parsed.notes : null,
    };
  } catch {
    return null;
  }
}

/**
 * Create a mention by hand. Accepts any combination of: an Instagram link
 * (profile / post / reel / story), a typed handle, and up to 3 screenshots.
 * The handle is resolved in this order: typed → from the link → from the
 * screenshot. Screenshots also supply caption and engagement.
 */
export async function captureMention(formData: FormData): Promise<CaptureResult> {
  const user = await requireUser();

  const linkRaw = String(formData.get("link") ?? "").trim();
  const handleRaw = String(formData.get("handle") ?? "").trim();
  const noteRaw = String(formData.get("note") ?? "").trim();
  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 3);
  for (const f of files) {
    if (f.size > 8_000_000) return { ok: false, error: "Image too large (max 8MB)." };
    if (!f.type.startsWith("image/")) return { ok: false, error: "Only images are supported." };
  }

  const parsedLink = linkRaw ? parseInstagramUrl(linkRaw) : null;
  if (linkRaw && !parsedLink) {
    return { ok: false, error: "That doesn't look like an Instagram link. Paste a profile, post, reel, or story URL." };
  }

  let extracted: CapturedMention | null = null;
  if (files.length > 0) {
    extracted = await extractMentionFromScreenshots(files);
    if (!extracted) return { ok: false, error: "Couldn't read the screenshot — try a clearer one." };
  }

  const username =
    cleanInstagramHandle(handleRaw) ??
    (parsedLink && "handle" in parsedLink ? parsedLink.handle : null) ??
    cleanInstagramHandle(extracted?.username);
  if (!username) {
    return {
      ok: false,
      error: files.length
        ? "Couldn't read the other account's @handle from the screenshot — type it in the handle field."
        : parsedLink && parsedLink.kind !== "profile"
          ? "Post links don't include who posted them. Type their @handle (shown at the top of the post) or add a screenshot."
          : "Enter the @handle of who tagged you, paste their profile link, or add a screenshot.",
    };
  }
  if (username.toLowerCase() === "heavensleaf") {
    return { ok: false, error: "That's your own account — enter the handle of the person who tagged you." };
  }

  const mediaType =
    extracted?.mediaType ??
    (parsedLink?.kind === "reel" ? "REEL" : parsedLink?.kind === "story" ? "STORY" : parsedLink?.kind === "post" ? "POST" : null);
  const postedAt = extracted?.postedAt ? new Date(`${extracted.postedAt}T12:00:00`) : new Date();
  const permalink = parsedLink && parsedLink.kind !== "profile" ? parsedLink.url : null;
  const externalId = permalink
    ? mentionExternalId("MANUAL", permalink)
    : mentionExternalId("MANUAL", `${username}:${Date.now()}`);
  const captionBits = [extracted?.caption, noteRaw ? `Note: ${noteRaw}` : null, extracted?.notes ? `AI: ${extracted.notes}` : null]
    .filter(Boolean);

  const record: MentionRecord = {
    source: "MANUAL",
    externalId,
    mediaId: parsedLink && "code" in parsedLink ? parsedLink.code : null,
    username,
    caption: captionBits.length ? captionBits.join("\n") : null,
    permalink,
    mediaType,
    likeCount: extracted?.likes ?? null,
    commentCount: extracted?.comments ?? null,
    postedAt: isNaN(postedAt.getTime()) ? new Date() : postedAt,
    raw: { capturedBy: user.id, link: linkRaw || null, screenshots: files.length, extracted },
  };

  const existed = await prisma.socialMention.findUnique({ where: { externalId }, select: { id: true } });
  await upsertMentions([record]);
  const m = await prisma.socialMention.findUnique({
    where: { externalId },
    include: {
      influencer: { select: { id: true, name: true } },
      prospect: { select: { id: true, businessName: true } },
    },
  });
  if (!m) return { ok: false, error: "Saving the mention failed." };

  await audit("social.mention_captured", {
    actorId: user.id,
    entityType: "SocialMention",
    entityId: m.id,
    diff: { username, link: linkRaw || null, screenshots: files.length, duplicate: Boolean(existed) },
  });
  revalidateSocial(m.influencerId);
  return {
    ok: true,
    mentionId: m.id,
    username,
    duplicate: Boolean(existed),
    influencer: m.influencer,
    prospect: m.prospect ? { id: m.prospect.id, name: m.prospect.businessName } : null,
  };
}
