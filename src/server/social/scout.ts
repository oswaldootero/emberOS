import "server-only";
import { prisma } from "@/lib/prisma";
import { openai, MODELS } from "@/lib/openai";
import { cleanInstagramHandle } from "./instagram";
import {
  normalizeCandidates,
  normalizeHashtagBrief,
  parseFollowers,
  parseModelJson,
  type HashtagBrief,
  type ScoutCandidate,
} from "./scout-parse";

/**
 * AI scouting without the Meta API: OpenAI's web search finds public
 * Instagram accounts and hashtag activity. Results are a search engine's
 * view — good for established accounts, weak for brand-new ones — so
 * everything is labelled approximate and verified by a human before use.
 */

const BRAND_CONTEXT = `Heaven's Leaf is a premium boutique cigar brand (Nicaraguan blends, faith, brotherhood, slow living). It sells wholesale to cigar lounges, tobacconists and private clubs, and seeds cigars to lifestyle influencers who post about cigars, whiskey, golf, watches, and men's brotherhood.`;

async function brandVoiceNote(): Promise<string> {
  try {
    const bv = await prisma.brandVoice.findFirst({
      orderBy: { createdAt: "asc" },
      select: { description: true, toneDescriptors: true },
    });
    if (!bv) return "";
    const tones = Array.isArray(bv.toneDescriptors) ? (bv.toneDescriptors as unknown[]).slice(0, 8).join(", ") : "";
    return [bv.description, tones && `Tone: ${tones}.`].filter(Boolean).join(" ");
  } catch {
    return "";
  }
}

type JsonSchema = Record<string, unknown>;

/** One web-search-enabled call that must answer in the given JSON schema. */
async function webSearchJson(
  system: string,
  user: string,
  schema: JsonSchema,
  name: string,
  contextSize: "low" | "medium" = "medium",
): Promise<{ raw: unknown; model: string }> {
  const model = MODELS.primary();
  const r = await openai().responses.create({
    model,
    tools: [{ type: "web_search_preview", search_context_size: contextSize }],
    text: { format: { type: "json_schema", name, schema, strict: true } },
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return { raw: parseModelJson(r.output_text ?? ""), model };
}

const nullableString = { type: ["string", "null"] };

const ACCOUNTS_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    accounts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          instagramUrl: nullableString,
          kind: { type: "string", enum: ["influencer", "business"] },
          summary: { type: "string" },
          followers: nullableString,
          location: nullableString,
          website: nullableString,
          sourceUrl: nullableString,
        },
        required: ["name", "instagramUrl", "kind", "summary", "followers", "location", "website", "sourceUrl"],
      },
    },
  },
  required: ["accounts"],
};

const IG_LOOKUP_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    instagramUrl: nullableString,
    followers: nullableString,
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["instagramUrl", "followers", "confidence"],
};

const BRIEF_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    hashtags: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          tag: { type: "string" },
          why: { type: "string" },
          use: { type: "string", enum: ["post", "monitor", "both"] },
          volume: { type: "string", enum: ["high", "medium", "niche"] },
        },
        required: ["tag", "why", "use", "volume"],
      },
    },
    accountsToWatch: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { handle: { type: "string" }, why: { type: "string" } },
        required: ["handle", "why"],
      },
    },
  },
  required: ["summary", "hashtags", "accountsToWatch"],
};

/**
 * Phase 2: business listings from web search rarely include the Instagram
 * URL, so look it up per business. Returns a handle only on a confident hit.
 */
async function lookupInstagramFor(c: ScoutCandidate): Promise<{ handle: string | null; followers: number | null }> {
  try {
    const { raw } = await webSearchJson(
      `Find the official Instagram profile for the given business using web search (try: site:instagram.com "<name>", then "<name> <city> instagram"). Return the instagram.com/<handle> URL only when a result clearly shows it belongs to this exact business; otherwise null. Fill followers only if a result snippet shows a count such as "12.4K followers".`,
      [c.name, c.location, c.website].filter(Boolean).join(" — "),
      IG_LOOKUP_SCHEMA,
      "ig_lookup",
      "low",
    );
    const o = (raw ?? {}) as { instagramUrl?: unknown; followers?: unknown; confidence?: unknown };
    if (o.confidence === "low") return { handle: null, followers: null };
    const handle = cleanInstagramHandle(typeof o.instagramUrl === "string" ? o.instagramUrl : null);
    return { handle, followers: handle ? parseFollowers(o.followers) : null };
  } catch {
    return { handle: null, followers: null };
  }
}

export type ScoutResult = ScoutCandidate & {
  tracked: { influencerId: string | null; prospectId: string | null };
};

const MAX_LOOKUPS = 8;

export async function searchInstagramAccounts(query: string, limit = 12): Promise<ScoutResult[]> {
  const voice = await brandVoiceNote();
  const { raw } = await webSearchJson(
    `You are a social scouting researcher for a cigar brand. ${BRAND_CONTEXT} ${voice}
Use web search to find REAL, currently active public Instagram accounts (creators) or businesses matching the user's request. For creators, search with "site:instagram.com" plus the topic so results show instagram.com/<handle> URLs and follower counts. For businesses (lounges, shops), listings are fine even without an Instagram URL — leave instagramUrl null rather than guessing; include the website. Never invent handles. Up to ${limit} results, best fit first. summary = one sentence on what they post / what the business is and why it fits the brand.`,
    query,
    ACCOUNTS_SCHEMA,
    "scout_accounts",
  );
  let candidates = normalizeCandidates(raw).slice(0, limit);
  if (candidates.length === 0) return [];

  // Phase 2 — resolve missing Instagram profiles for businesses, in parallel.
  const missing = candidates.filter((c) => !c.handle).slice(0, MAX_LOOKUPS);
  if (missing.length > 0) {
    const found = await Promise.all(missing.map((c) => lookupInstagramFor(c)));
    const byName = new Map(missing.map((c, i) => [c.name, found[i]!]));
    candidates = candidates.map((c) => {
      const f = !c.handle ? byName.get(c.name) : undefined;
      return f?.handle
        ? { ...c, handle: f.handle, url: `https://instagram.com/${f.handle}`, followersApprox: c.followersApprox ?? f.followers }
        : c;
    });
  }

  const handles = candidates.map((c) => c.handle?.toLowerCase()).filter((h): h is string => Boolean(h));
  const [influencers, prospects] = handles.length === 0 ? [[], []] : await Promise.all([
    prisma.influencer.findMany({
      where: { handle: { in: handles, mode: "insensitive" } },
      select: { id: true, handle: true },
    }),
    prisma.prospect.findMany({
      where: { OR: handles.map((h) => ({ instagram: { contains: h, mode: "insensitive" as const } })) },
      select: { id: true, instagram: true },
    }),
  ]);
  return candidates.map((c) => {
    const h = c.handle?.toLowerCase();
    return {
      ...c,
      tracked: {
        influencerId: h ? influencers.find((i) => i.handle?.toLowerCase() === h)?.id ?? null : null,
        prospectId: h ? prospects.find((p) => p.instagram?.toLowerCase().includes(h))?.id ?? null : null,
      },
    };
  });
}

// ─────────────────────────────────────────────────────────────────
// Daily hashtag brief
// ─────────────────────────────────────────────────────────────────

export type StoredBrief = HashtagBrief & { forDate: string; createdAt: string };

export function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toStored(row: { forDate: Date; createdAt: Date; summary: string | null; items: unknown }): StoredBrief | null {
  const items = row.items as { hashtags?: unknown; accountsToWatch?: unknown } | null;
  const b = normalizeHashtagBrief({ summary: row.summary, ...(items ?? {}) });
  return b ? { ...b, forDate: row.forDate.toISOString(), createdAt: row.createdAt.toISOString() } : null;
}

export async function getHashtagBrief(day = utcDay()): Promise<StoredBrief | null> {
  const row = await prisma.socialHashtagBrief.findUnique({ where: { forDate: day } });
  return row ? toStored(row) : null;
}

export async function generateHashtagBrief(day = utcDay(), force = false): Promise<StoredBrief | null> {
  if (!force) {
    const existing = await getHashtagBrief(day);
    if (existing) return existing;
  }
  const voice = await brandVoiceNote();
  const dateLabel = day.toISOString().slice(0, 10);
  const { raw, model } = await webSearchJson(
    `You are the daily social strategist for a cigar brand. ${BRAND_CONTEXT} ${voice}
Today is ${dateLabel}. Use web search to check what is currently active in the cigar / whiskey / men's lifestyle corner of Instagram: trending hashtags, events this week (cigar festivals, releases, holidays like Father's Day or National Cigar Day), and industry press. Recommend hashtags Heaven's Leaf should POST with (reach + fit) and hashtags to MONITOR for finding lounges, shops and influencers to reach out to.
summary = 2–3 sentences on what's happening this week and the angle to take. Give 10–12 hashtags (mix of high-volume and niche; tag without the #) and 3–5 accountsToWatch (Instagram handles without @).`,
    `Give me today's hashtag brief for ${dateLabel}.`,
    BRIEF_SCHEMA,
    "hashtag_brief",
  );
  const brief = normalizeHashtagBrief(raw);
  if (!brief) return null;
  const row = await prisma.socialHashtagBrief.upsert({
    where: { forDate: day },
    create: {
      forDate: day,
      summary: brief.summary,
      items: { hashtags: brief.hashtags, accountsToWatch: brief.accountsToWatch },
      model,
    },
    update: {
      summary: brief.summary,
      items: { hashtags: brief.hashtags, accountsToWatch: brief.accountsToWatch },
      model,
    },
  });
  return toStored(row);
}
