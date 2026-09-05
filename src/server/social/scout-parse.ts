/**
 * Pure shaping of the AI scout's JSON — no network, no database.
 */
import { cleanInstagramHandle } from "./instagram";

export type ScoutCandidate = {
  /** Instagram username, or null when the search found the business but not its profile */
  handle: string | null;
  name: string;
  /** Instagram profile URL when handle is known, else the website or null */
  url: string | null;
  kind: "INFLUENCER" | "BUSINESS" | "UNKNOWN";
  summary: string | null;
  followersApprox: number | null;
  location: string | null;
  website: string | null;
  sourceUrl: string | null;
};

export type HashtagBrief = {
  summary: string | null;
  hashtags: {
    tag: string;
    why: string;
    use: "post" | "monitor" | "both";
    volume: "high" | "medium" | "niche";
  }[];
  accountsToWatch: { handle: string; why: string }[];
};

/** Pull the first JSON object out of a model reply that may have prose or ``` fences. */
export function parseModelJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(t.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** "12.4K" / "1.2M" / "12,400" / 12400 → integer, else null. */
export function parseFollowers(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v) && v >= 0) return Math.round(v);
  if (typeof v !== "string") return null;
  const m = v.replace(/,/g, "").match(/([\d.]+)\s*([kKmM])?/);
  if (!m) return null;
  const n = parseFloat(m[1]!);
  if (isNaN(n)) return null;
  const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1_000 : 1;
  return Math.round(n * mult);
}

export function normalizeCandidates(raw: unknown): ScoutCandidate[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { accounts?: unknown }).accounts)
      ? (raw as { accounts: unknown[] }).accounts
      : [];
  const seen = new Set<string>();
  const out: ScoutCandidate[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const handle = cleanInstagramHandle(
      str(o.handle) ?? str(o.username) ?? str(o.instagramUrl) ?? str(o.url),
    );
    const name = str(o.name) ?? handle;
    if (!name) continue;
    const key = handle ? `@${handle.toLowerCase()}` : name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const website = str(o.website);
    const kindRaw = (str(o.kind) ?? str(o.type) ?? "").toUpperCase();
    const kind: ScoutCandidate["kind"] =
      kindRaw.startsWith("INFL") || kindRaw === "CREATOR" || kindRaw === "PERSON"
        ? "INFLUENCER"
        : kindRaw.startsWith("BUS") || kindRaw === "LOUNGE" || kindRaw === "SHOP" || kindRaw === "RETAILER" || kindRaw === "BRAND"
          ? "BUSINESS"
          : "UNKNOWN";
    out.push({
      handle,
      name,
      url: handle ? `https://instagram.com/${handle}` : website,
      kind,
      summary: str(o.summary) ?? str(o.why) ?? str(o.description),
      followersApprox: parseFollowers(o.followers ?? o.followersApprox ?? o.follower_count),
      location: str(o.location),
      website,
      sourceUrl: str(o.sourceUrl) ?? str(o.source),
    });
  }
  return out;
}

export function normalizeHashtagBrief(raw: unknown): HashtagBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const tags = Array.isArray(o.hashtags) ? o.hashtags : [];
  const seen = new Set<string>();
  const hashtags: HashtagBrief["hashtags"] = [];
  for (const t of tags) {
    if (!t || typeof t !== "object") continue;
    const h = t as Record<string, unknown>;
    const tagRaw = str(h.tag) ?? str(h.hashtag);
    if (!tagRaw) continue;
    const tag = tagRaw.replace(/^#/, "").replace(/\s+/g, "").toLowerCase();
    if (!/^[a-z0-9_]{2,60}$/.test(tag) || seen.has(tag)) continue;
    seen.add(tag);
    const useRaw = (str(h.use) ?? "both").toLowerCase();
    const volRaw = (str(h.volume) ?? "medium").toLowerCase();
    hashtags.push({
      tag,
      why: str(h.why) ?? str(h.reason) ?? "",
      use: useRaw === "post" || useRaw === "monitor" ? useRaw : "both",
      volume: volRaw === "high" || volRaw === "niche" ? volRaw : "medium",
    });
  }
  const accountsToWatch: HashtagBrief["accountsToWatch"] = [];
  for (const a of Array.isArray(o.accountsToWatch) ? o.accountsToWatch : []) {
    if (!a || typeof a !== "object") continue;
    const r = a as Record<string, unknown>;
    const handle = cleanInstagramHandle(str(r.handle) ?? str(r.username));
    if (handle) accountsToWatch.push({ handle, why: str(r.why) ?? "" });
  }
  if (hashtags.length === 0) return null;
  return { summary: str(o.summary), hashtags, accountsToWatch };
}
