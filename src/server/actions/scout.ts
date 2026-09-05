"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  generateHashtagBrief,
  searchInstagramAccounts,
  type ScoutResult,
  type StoredBrief,
} from "@/server/social/scout";
import type { ScoutCandidate } from "@/server/social/scout-parse";

export type ScoutActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

function aiError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/api key/i.test(msg)) return "OpenAI isn't configured — add OPENAI_API_KEY.";
  if (/rate limit|429/i.test(msg)) return "OpenAI rate limit hit — try again in a minute.";
  if (/web_search|tool/i.test(msg)) return `This model can't use web search (${env.OPENAI_MODEL_PRIMARY}). Set OPENAI_MODEL_PRIMARY to gpt-4o or gpt-4.1.`;
  return `Search failed: ${msg.slice(0, 160)}`;
}

export async function findInstagramAccounts(
  query: string,
): Promise<ScoutActionResult<{ results: ScoutResult[] }>> {
  const user = await requireUser();
  const q = query.trim();
  if (q.length < 3) return { ok: false, error: "Describe who you're looking for — at least a few words." };
  if (q.length > 300) return { ok: false, error: "Keep the search under 300 characters." };
  try {
    const results = await searchInstagramAccounts(q);
    await audit("social.scout_search", {
      actorId: user.id,
      diff: { query: q, results: results.length },
    });
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}

export async function addScoutedAccount(
  candidate: ScoutCandidate,
  as: "influencer" | "prospect",
): Promise<ScoutActionResult<{ id: string; created: boolean }>> {
  const user = await requireUser();
  const handle = candidate.handle;
  if (as === "influencer" && !handle) {
    return { ok: false, error: "No Instagram handle was found for this one — open their website, find the handle, and use Capture or Add influencer by hand." };
  }
  const sourceNote = [
    `Found by AI scout on ${new Date().toLocaleDateString("en-US")}.`,
    candidate.summary,
    candidate.followersApprox != null ? `~${candidate.followersApprox.toLocaleString()} followers (approx., from search results)` : null,
    candidate.sourceUrl ? `Source: ${candidate.sourceUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (as === "influencer" && handle) {
    const existing = await prisma.influencer.findFirst({
      where: { handle: { equals: handle, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return { ok: true, id: existing.id, created: false };
    const inf = await prisma.influencer.create({
      data: {
        name: candidate.name || handle,
        handle,
        platform: "Instagram",
        profileUrl: `https://instagram.com/${handle}`,
        followerCount: candidate.followersApprox,
        niche: candidate.summary ? candidate.summary.slice(0, 120) : null,
        location: candidate.location,
        tags: ["ai-scout"],
        notes: sourceNote,
      },
    });
    await audit("influencers.created", {
      actorId: user.id,
      entityType: "Influencer",
      entityId: inf.id,
      diff: { via: "ai-scout", handle },
    });
    revalidatePath("/influencers");
    return { ok: true, id: inf.id, created: true };
  }

  const existing = await prisma.prospect.findFirst({
    where: handle
      ? { instagram: { contains: handle, mode: "insensitive" } }
      : { businessName: { equals: candidate.name.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return { ok: true, id: existing.id, created: false };
  const [city, state] = (candidate.location ?? "").split(",").map((s) => s.trim());
  const p = await prisma.prospect.create({
    data: {
      businessName: candidate.name || handle || "Unknown",
      instagram: handle ? `https://instagram.com/${handle}` : null,
      website: candidate.website,
      city: city || null,
      state: state || null,
      tags: ["ai-scout"],
      notes: sourceNote,
    },
  });
  await audit("prospects.created", {
    actorId: user.id,
    entityType: "Prospect",
    entityId: p.id,
    diff: { via: "ai-scout", handle },
  });
  revalidatePath("/prospects");
  return { ok: true, id: p.id, created: true };
}

export async function refreshHashtagBrief(
  force = false,
): Promise<ScoutActionResult<{ brief: StoredBrief | null }>> {
  const user = await requireUser();
  try {
    const brief = await generateHashtagBrief(undefined, force);
    if (!brief) return { ok: false, error: "The model didn't return usable hashtags — try again." };
    await audit("social.hashtag_brief", { actorId: user.id, diff: { forDate: brief.forDate, force } });
    revalidatePath("/social/find");
    return { ok: true, brief };
  } catch (e) {
    return { ok: false, error: aiError(e) };
  }
}
