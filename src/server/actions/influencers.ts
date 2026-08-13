"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";

export type InfluencerResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const STAGES = [
  "PROSPECT",
  "CONTACTED",
  "IN_CONVERSATION",
  "AGREED",
  "CIGARS_SENT",
  "ACTIVE_PARTNER",
  "INACTIVE",
  "DECLINED",
] as const;

const POST_TYPES = [
  "POST",
  "STORY",
  "REEL",
  "VIDEO",
  "LIVE",
  "UNBOXING",
  "REVIEW",
  "GIVEAWAY",
  "MENTION",
  "OTHER",
] as const;

const InfluencerSchema = z.object({
  name: z.string().min(1).max(160),
  handle: z.string().max(120).optional().nullable(),
  platform: z.string().max(60).optional().default("Instagram"),
  profileUrl: z.string().max(300).optional().nullable(),
  followerCount: z.number().int().nonnegative().optional().nullable(),
  followingCount: z.number().int().nonnegative().optional().nullable(),
  postCount: z.number().int().nonnegative().optional().nullable(),
  niche: z.string().max(120).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  email: z.string().max(160).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  otherSocials: z.string().max(300).optional().nullable(),
  stage: z.enum(STAGES).default("PROSPECT"),
  assignedToId: z.string().optional().nullable(),
  nextFollowupDate: z.string().optional().nullable(),
  agreementTerms: z.string().max(3000).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().max(5000).optional().nullable(),
});

const ShipmentSchema = z.object({
  sentAt: z.string().optional().nullable(),
  cigarCount: z.number().int().positive().max(10000),
  contents: z.string().max(2000).optional().nullable(),
  costUsd: z.number().nonnegative().max(100000).optional().nullable(),
  carrier: z.string().max(60).optional().nullable(),
  trackingNumber: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

const PostSchema = z.object({
  postedAt: z.string().optional().nullable(),
  type: z.enum(POST_TYPES).default("POST"),
  url: z.string().max(500).optional().nullable(),
  caption: z.string().max(3000).optional().nullable(),
  likes: z.number().int().nonnegative().optional().nullable(),
  comments: z.number().int().nonnegative().optional().nullable(),
  views: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

function firstError(e: z.ZodError): string {
  const f = e.errors[0];
  return f ? `${f.path.join(".")}: ${f.message}` : "Invalid input";
}

function revalidateInfluencers(id?: string) {
  revalidatePath("/influencers");
  if (id) revalidatePath(`/influencers/${id}`);
}

function nullifyEmpty<T extends Record<string, unknown>>(d: T): T {
  return Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, v === "" ? null : v]),
  ) as T;
}

/** Strip a leading @ and any instagram.com/ prefix from a pasted handle. */
function cleanHandle(h: string | null | undefined): string | null {
  if (!h) return null;
  const m = h.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/^@/, "").replace(/\/.*$/, "");
  return m || null;
}

// ─────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────

export async function createInfluencer(input: unknown): Promise<InfluencerResult> {
  const user = await requireUser();
  const parsed = InfluencerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  const inf = await prisma.influencer.create({
    data: {
      ...d,
      handle: cleanHandle(d.handle),
      nextFollowupDate: d.nextFollowupDate ? new Date(d.nextFollowupDate) : null,
      tags: d.tags ?? [],
    },
  });
  await audit("influencers.created", {
    actorId: user.id,
    entityType: "Influencer",
    entityId: inf.id,
  });
  revalidateInfluencers();
  return { ok: true, id: inf.id };
}

export async function updateInfluencer(
  id: string,
  input: unknown,
): Promise<InfluencerResult> {
  const user = await requireUser();
  const parsed = InfluencerSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  await prisma.influencer.update({
    where: { id },
    data: {
      ...d,
      handle: d.handle === undefined ? undefined : cleanHandle(d.handle),
      nextFollowupDate:
        d.nextFollowupDate === undefined
          ? undefined
          : d.nextFollowupDate
            ? new Date(d.nextFollowupDate)
            : null,
    },
  });
  await audit("influencers.updated", {
    actorId: user.id,
    entityType: "Influencer",
    entityId: id,
  });
  revalidateInfluencers(id);
  return { ok: true, id };
}

export async function setInfluencerStage(
  id: string,
  stage: (typeof STAGES)[number],
): Promise<InfluencerResult> {
  const user = await requireUser();
  await prisma.influencer.update({
    where: { id },
    data: { stage, lastContactDate: new Date() },
  });
  await audit("influencers.stage_changed", {
    actorId: user.id,
    entityType: "Influencer",
    entityId: id,
    diff: { stage },
  });
  revalidateInfluencers(id);
  return { ok: true, id };
}

export async function bulkDeleteInfluencers(
  ids: string[],
): Promise<InfluencerResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Admin only." };
  if (!ids.length) return { ok: false, error: "Nothing selected." };
  const r = await prisma.influencer.deleteMany({ where: { id: { in: ids } } });
  await audit("influencers.bulk_deleted", {
    actorId: user.id,
    entityType: "Influencer",
    diff: { count: r.count },
  });
  revalidateInfluencers();
  return { ok: true, id: String(r.count) };
}

// ─────────────────────────────────────────────────────────────────
// Cigar shipments
// ─────────────────────────────────────────────────────────────────

export async function addInfluencerShipment(
  influencerId: string,
  input: unknown,
): Promise<InfluencerResult> {
  const user = await requireUser();
  const parsed = ShipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  const inf = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: { id: true, stage: true },
  });
  if (!inf) return { ok: false, error: "Influencer not found." };

  const s = await prisma.influencerShipment.create({
    data: {
      influencerId,
      sentAt: d.sentAt ? new Date(d.sentAt) : new Date(),
      cigarCount: d.cigarCount,
      contents: d.contents,
      costUsd: d.costUsd,
      carrier: d.carrier,
      trackingNumber: d.trackingNumber,
      notes: d.notes,
      createdById: user.id,
    },
  });

  // Sending cigars is contact; advance early-stage relationships automatically.
  const earlyStages = ["PROSPECT", "CONTACTED", "IN_CONVERSATION", "AGREED"];
  await prisma.influencer.update({
    where: { id: influencerId },
    data: {
      lastContactDate: new Date(),
      ...(earlyStages.includes(inf.stage) ? { stage: "CIGARS_SENT" } : {}),
    },
  });

  await audit("influencers.shipment_added", {
    actorId: user.id,
    entityType: "InfluencerShipment",
    entityId: s.id,
    diff: { influencerId, cigarCount: d.cigarCount },
  });
  revalidateInfluencers(influencerId);
  return { ok: true, id: s.id };
}

export async function deleteInfluencerShipment(
  id: string,
): Promise<InfluencerResult> {
  const user = await requireUser();
  const s = await prisma.influencerShipment.delete({
    where: { id },
    select: { influencerId: true },
  });
  await audit("influencers.shipment_deleted", {
    actorId: user.id,
    entityType: "InfluencerShipment",
    entityId: id,
  });
  revalidateInfluencers(s.influencerId);
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────

export async function addInfluencerPost(
  influencerId: string,
  input: unknown,
): Promise<InfluencerResult> {
  const user = await requireUser();
  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = nullifyEmpty(parsed.data);

  const inf = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: { id: true },
  });
  if (!inf) return { ok: false, error: "Influencer not found." };

  const p = await prisma.influencerPost.create({
    data: {
      influencerId,
      postedAt: d.postedAt ? new Date(d.postedAt) : new Date(),
      type: d.type,
      url: d.url,
      caption: d.caption,
      likes: d.likes,
      comments: d.comments,
      views: d.views,
      notes: d.notes,
      createdById: user.id,
    },
  });
  await audit("influencers.post_added", {
    actorId: user.id,
    entityType: "InfluencerPost",
    entityId: p.id,
    diff: { influencerId, type: d.type },
  });
  revalidateInfluencers(influencerId);
  return { ok: true, id: p.id };
}

export async function deleteInfluencerPost(
  id: string,
): Promise<InfluencerResult> {
  const user = await requireUser();
  const p = await prisma.influencerPost.delete({
    where: { id },
    select: { influencerId: true },
  });
  await audit("influencers.post_deleted", {
    actorId: user.id,
    entityType: "InfluencerPost",
    entityId: id,
  });
  revalidateInfluencers(p.influencerId);
  return { ok: true, id };
}

// ─────────────────────────────────────────────────────────────────
// Screenshot → influencer (vision extraction)
// ─────────────────────────────────────────────────────────────────

export type ExtractedInfluencer = {
  name: string;
  handle: string | null;
  platform: string | null;
  followerCount: number | null;
  followingCount: number | null;
  postCount: number | null;
  niche: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  otherSocials: string | null;
  notes: string | null;
};

export type InfluencerExtractionResult =
  | {
      ok: true;
      fields: ExtractedInfluencer;
      /** Set when an influencer with the same handle (or name) already exists */
      existing: { id: string; name: string } | null;
    }
  | { ok: false; error: string };

export async function extractInfluencerFromScreenshots(
  formData: FormData,
): Promise<InfluencerExtractionResult> {
  await requireUser();
  const { openai, MODELS } = await import("@/lib/openai");

  const files = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, 3);
  if (files.length === 0) {
    return { ok: false, error: "No screenshots received." };
  }
  for (const f of files) {
    if (f.size > 8_000_000) return { ok: false, error: "Image too large (max 8MB)." };
    if (!f.type.startsWith("image/")) return { ok: false, error: "Only images are supported." };
  }

  const images = await Promise.all(
    files.map(async (f) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString("base64")}`,
      },
    })),
  );

  let fields: ExtractedInfluencer;
  try {
    const r = await openai().chat.completions.create({
      model: MODELS.primary(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract influencer data for a premium cigar brand from screenshots of social profiles (usually Instagram, sometimes TikTok/YouTube/X).

Return JSON with exactly these keys (null when not visible — never guess):
name (string, required — their display name; fall back to the handle if no display name is shown), handle (their @username without the @), platform (one of "Instagram", "TikTok", "YouTube", "X", "Facebook", or null), followerCount (integer — expand shorthand like "12.4K" to 12400 and "1.2M" to 1200000), followingCount (integer, same expansion), postCount (integer — the lifetime posts number shown on the profile), niche (short label for what they post about, e.g. "cigar lifestyle", "whiskey & cigars", "golf"), bio (their bio text verbatim, trimmed), location (city/region if shown in the bio), email (only if visible in the bio or contact button), otherSocials (other handles/links mentioned in the bio), notes (anything else useful for a partnerships manager: verified badge, engagement hints, link-in-bio, brand deals visible in their grid — or null).

If no social profile is recognizable, return {"name": null}.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the influencer profile from these screenshots:" },
            ...images,
          ],
        },
      ],
    });
    fields = JSON.parse(r.choices[0]?.message?.content ?? "{}");
  } catch {
    return { ok: false, error: "Extraction failed — try a clearer screenshot." };
  }

  if (!fields?.name || typeof fields.name !== "string") {
    return {
      ok: false,
      error: "Couldn't find a social profile in that screenshot.",
    };
  }
  const handle = cleanHandle(fields.handle);
  fields.handle = handle;

  // Dedup: same handle (preferred) or same name already tracked?
  const existing = await prisma.influencer.findFirst({
    where: handle
      ? { handle: { equals: handle, mode: "insensitive" } }
      : { name: { equals: fields.name, mode: "insensitive" } },
    select: { id: true, name: true },
  });

  return { ok: true, fields, existing };
}
