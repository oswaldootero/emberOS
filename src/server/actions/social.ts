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
  summarizeProfile,
  type IgProfileSummary,
} from "@/server/social/instagram";
import { syncTaggedMedia } from "@/server/social/sync";

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
