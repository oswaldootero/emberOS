import "server-only";
import { z } from "zod";
import { openai } from "@/lib/openai";
import type { Prospect } from "@prisma/client";

/**
 * Prospect intelligence via OpenAI.
 *
 * Two operations:
 *  - enrich: discover public links / contact info the model knows about
 *    (website, socials, rating, hours). Knowledge-based, not live web —
 *    every result carries a confidence level and must be treated as a
 *    suggestion to verify, never ground truth.
 *  - analyze: the Heaven's Leaf sales brain. Compatibility score with
 *    reasoning, Lounge DNA tags, pursue/maybe/skip verdict, order
 *    estimates, and a full structured sales briefing.
 */

const BRAND_CONTEXT = `Heaven's Leaf is a boutique premium cigar brand built around faith, brotherhood, and craftsmanship ("the slow burn, the long road"). Wholesale line: El Cuñado (Maduro, Connecticut, Habano) boxes at ~$65 wholesale / 10 cigars, plus 5-packs and the premium Cosecha Dorada. Ideal accounts: premium cigar lounges and retailers with loyal communities — whiskey culture, motorcycle groups, golf communities, veterans, faith-friendly crowds. Typical opening order: 3–6 boxes ($200–$400). Strong accounts reorder every 4–8 weeks.`;

function prospectFacts(p: Prospect): string {
  const parts = [
    `Business: ${p.businessName}${p.dba ? ` (DBA ${p.dba})` : ""}`,
    p.businessType && `Type: ${p.businessType}`,
    (p.city || p.state) && `Location: ${[p.street, p.city, p.state, p.zipCode].filter(Boolean).join(", ")}`,
    p.website && `Website: ${p.website}`,
    p.instagram && `Instagram: ${p.instagram}`,
    p.facebook && `Facebook: ${p.facebook}`,
    p.googleRating != null && `Google rating: ${p.googleRating} (${p.reviewCount ?? "?"} reviews)`,
    p.description && `Description: ${p.description}`,
    p.humidorSize && `Humidor: ${p.humidorSize}`,
    p.footTraffic && `Foot traffic: ${p.footTraffic}`,
    p.demographic && `Demographic: ${p.demographic}`,
    p.notes && `Internal notes: ${p.notes}`,
  ].filter(Boolean);
  return parts.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// Enrichment
// ─────────────────────────────────────────────────────────────────

const EnrichmentSchema = z.object({
  recognized: z.boolean(),
  website: z.string().nullish(),
  instagram: z.string().nullish(),
  facebook: z.string().nullish(),
  yelp: z.string().nullish(),
  googleProfile: z.string().nullish(),
  phone: z.string().nullish(),
  street: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  zipCode: z.string().nullish(),
  businessType: z.string().nullish(),
  businessHours: z.string().nullish(),
  description: z.string().nullish(),
  googleRating: z.number().nullish(),
  confidence: z.enum(["high", "medium", "low"]).default("low"),
  note: z.string().nullish(),
});

export type ProspectEnrichment = z.infer<typeof EnrichmentSchema>;

export async function enrichProspectAI(
  p: Prospect,
): Promise<{ ok: true; data: ProspectEnrichment } | { ok: false; error: string }> {
  try {
    const completion = await openai().chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You help a cigar wholesaler fill in prospect records for cigar lounges and tobacco retailers in the USA. Given a business, report what you genuinely know about it as JSON:

{"recognized": boolean, "website": string|null, "instagram": string|null, "facebook": string|null, "yelp": string|null, "googleProfile": string|null, "phone": string|null, "street": string|null, "city": string|null, "state": string|null, "zipCode": string|null, "businessType": string|null, "businessHours": string|null, "description": string|null, "googleRating": number|null, "confidence": "high"|"medium"|"low", "note": string|null}

Rules:
- Only report what you actually recognize. NEVER invent URLs, handles, street numbers, or ratings. null is always better than a guess.
- If you don't recognize the business, set recognized=false and use "note" to say so; you may still infer businessType/description from the name.
- businessType: one of "Retail", "Retail + lounge", "Private club", "Membership lounge" if determinable.
- Social handles as full URLs. US state as 2-letter code.`,
        },
        { role: "user", content: prospectFacts(p) },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ok: false, error: "Empty AI response." };
    return { ok: true, data: EnrichmentSchema.parse(JSON.parse(raw)) };
  } catch (e) {
    return {
      ok: false,
      error: `Enrichment failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Analysis — score, DNA, verdict, briefing
// ─────────────────────────────────────────────────────────────────

export const DNA_TAGS = [
  "luxury",
  "boutique-focused",
  "traditional",
  "whiskey-culture",
  "motorcycle-friendly",
  "golf-community",
  "veteran-friendly",
  "faith-friendly",
  "tourist-destination",
  "neighborhood-lounge",
  "corporate-clientele",
  "casual-smokers",
  "event-driven",
  "premium-experience",
] as const;

const BriefingSchema = z.object({
  overview: z.string(),
  customerProfile: z.string(),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  salesApproach: z.string(),
  conversationStarters: z.array(z.string()).default([]),
  suggestedProducts: z.array(z.string()).default([]),
  likelyObjections: z.array(z.string()).default([]),
  followUpCadence: z.string().nullish(),
  eventOpportunities: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
});

const AnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  scoreReason: z.string(),
  dna: z.array(z.string()).default([]),
  verdict: z.enum(["PURSUE", "MAYBE", "SKIP"]),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  firstOrderEstimate: z.number().nonnegative().nullish(),
  annualEstimate: z.number().nonnegative().nullish(),
  winProbability: z.number().min(0).max(100),
  briefing: BriefingSchema,
});

export type ProspectAnalysis = z.infer<typeof AnalysisSchema>;
export type ProspectBriefing = z.infer<typeof BriefingSchema>;

export async function analyzeProspectAI(
  p: Prospect,
): Promise<{ ok: true; data: ProspectAnalysis } | { ok: false; error: string }> {
  try {
    const completion = await openai().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the sales-intelligence brain for Heaven's Leaf, scoring how compatible a prospect is with the brand and writing the rep's sales briefing.

${BRAND_CONTEXT}

Score 0–100 on: premium/boutique positioning, community & event culture, demographic fit (whiskey/motorcycle/golf/veteran/faith affinity), online presence quality, review sentiment, and professionalism. Be honest about uncertainty — when little is known, score conservatively (40–60) and say what's unknown.

Return JSON:
{"score": number, "scoreReason": "2-4 sentences in plain language explaining the score", "dna": [tags from: ${DNA_TAGS.join(", ")}], "verdict": "PURSUE"|"MAYBE"|"SKIP", "priority": "HIGH"|"MEDIUM"|"LOW", "firstOrderEstimate": dollars|null, "annualEstimate": dollars|null, "winProbability": 0-100, "briefing": {"overview": string, "customerProfile": string, "strengths": [..], "weaknesses": [..], "opportunities": [..], "risks": [..], "salesApproach": string, "conversationStarters": [2-3 openers a rep could actually say], "suggestedProducts": [Heaven's Leaf products to lead with], "likelyObjections": [objection — suggested response], "followUpCadence": string, "eventOpportunities": [..], "nextActions": [2-4 concrete steps]}}

Ground every claim in the provided facts; where you infer, say "likely". Never fabricate reviews, events, or brands carried.`,
        },
        { role: "user", content: prospectFacts(p) },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ok: false, error: "Empty AI response." };
    const parsed = AnalysisSchema.parse(JSON.parse(raw));
    // Keep only known DNA tags
    parsed.dna = parsed.dna.filter((t) =>
      (DNA_TAGS as readonly string[]).includes(t),
    );
    return { ok: true, data: parsed };
  } catch (e) {
    return {
      ok: false,
      error: `Analysis failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// Natural-language search → structured filters
// ─────────────────────────────────────────────────────────────────

const SearchFilterSchema = z.object({
  q: z.string().nullish(),
  stage: z.string().nullish(),
  state: z.string().nullish(),
  city: z.string().nullish(),
  minScore: z.number().min(0).max(100).nullish(),
  verdict: z.enum(["PURSUE", "MAYBE", "SKIP"]).nullish(),
  dna: z.array(z.string()).default([]),
  needsFollowUp: z.boolean().nullish(),
  sort: z.enum(["aiScore", "updatedAt", "businessName", "nextFollowupDate"]).nullish(),
  explanation: z.string(),
});

export type ProspectSearchFilters = z.infer<typeof SearchFilterSchema>;

export async function parseProspectQueryAI(
  query: string,
): Promise<{ ok: true; data: ProspectSearchFilters } | { ok: false; error: string }> {
  try {
    const completion = await openai().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Translate a sales rep's natural-language question about cigar-lounge prospects into filter JSON:
{"q": text-search|null, "stage": one of LEAD,QUALIFIED,CONTACTED,MEETING_SCHEDULED,MEETING_COMPLETED,SAMPLES_DELIVERED,NEGOTIATION,FIRST_ORDER,ACTIVE_CUSTOMER,VIP_CUSTOMER,LOST or null, "state": 2-letter|null, "city": string|null, "minScore": 0-100|null, "verdict": "PURSUE"|"MAYBE"|"SKIP"|null, "dna": [tags from: ${DNA_TAGS.join(", ")}], "needsFollowUp": boolean|null, "sort": "aiScore"|"updatedAt"|"businessName"|"nextFollowupDate"|null, "explanation": "short human recap of the applied filters"}

Examples: "best prospects" → minScore 70, sort aiScore. "who should I follow up with" → needsFollowUp true. "motorcycle lounges in Florida" → dna ["motorcycle-friendly"], state "FL".`,
        },
        { role: "user", content: query },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return { ok: false, error: "Empty AI response." };
    return { ok: true, data: SearchFilterSchema.parse(JSON.parse(raw)) };
  } catch (e) {
    return {
      ok: false,
      error: `Search failed: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}
