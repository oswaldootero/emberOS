/**
 * Ideal Customer Profile (ICP) scoring model.
 *
 * Single source of truth for criteria, weights, tiers, and score math —
 * shared by the scoring card (client) and the save action (server).
 * Management adjusts weights here; scores are recomputed on next save.
 */

export type IcpAnswerValue = string | number | boolean;
export type IcpAnswers = Record<string, IcpAnswerValue>;

export type IcpCriterion = {
  key: string;
  label: string;
  weight: number;
  /** boolean = Yes/No · scale5 = 1–5 stars · tri = three labeled levels */
  kind: "boolean" | "scale5" | "tri";
  /** Labels for the three tri levels, scored 0 / ½ / full weight */
  triLabels?: [string, string, string];
};

export const ICP_CRITERIA: IcpCriterion[] = [
  { key: "premiumFocus", label: "Premium cigar focus", weight: 20, kind: "boolean" },
  { key: "hasLounge", label: "Has a cigar lounge", weight: 15, kind: "boolean" },
  { key: "walkInTraffic", label: "Walk-in traffic", weight: 10, kind: "tri", triLabels: ["Low", "Medium", "High"] },
  { key: "demographicsMatch", label: "Customer demographics match target audience", weight: 10, kind: "scale5" },
  { key: "boutiqueBrands", label: "Carries boutique brands", weight: 15, kind: "tri", triLabels: ["None", "Few", "Several"] },
  { key: "ownerApproachable", label: "Owner is approachable", weight: 10, kind: "scale5" },
  { key: "staffKnowledge", label: "Staff knowledgeable about premium cigars", weight: 5, kind: "scale5" },
  { key: "activeEvents", label: "Active events or cigar nights", weight: 10, kind: "tri", triLabels: ["Never", "Occasionally", "Frequently"] },
  { key: "socialPresence", label: "Strong social media presence", weight: 5, kind: "scale5" },
  { key: "competitorReplace", label: "Opportunity to replace competitors", weight: 10, kind: "tri", triLabels: ["Low", "Medium", "High"] },
];

export const ICP_MAX_SCORE = ICP_CRITERIA.reduce((s, c) => s + c.weight, 0); // 100

/** Points a single answered criterion contributes. */
export function criterionPoints(c: IcpCriterion, value: IcpAnswerValue | undefined | null): number {
  if (value == null) return 0;
  switch (c.kind) {
    case "boolean":
      return value === true || value === "yes" ? c.weight : 0;
    case "scale5": {
      const v = Number(value);
      if (!Number.isFinite(v) || v < 1) return 0;
      return (Math.min(5, v) / 5) * c.weight;
    }
    case "tri": {
      const idx = c.triLabels?.findIndex((l) => l === value) ?? -1;
      if (idx < 0) return 0;
      return (idx / 2) * c.weight; // 0 / ½ / full
    }
  }
}

/** Validates that a raw value is a legal answer for the criterion. */
export function isValidAnswer(c: IcpCriterion, value: unknown): value is IcpAnswerValue {
  switch (c.kind) {
    case "boolean":
      return typeof value === "boolean";
    case "scale5":
      return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
    case "tri":
      return typeof value === "string" && (c.triLabels?.includes(value) ?? false);
  }
}

export function computeIcpScore(answers: IcpAnswers): {
  score: number;
  answered: number;
  total: number;
} {
  let points = 0;
  let answered = 0;
  for (const c of ICP_CRITERIA) {
    const v = answers[c.key];
    if (v == null) continue;
    answered++;
    points += criterionPoints(c, v);
  }
  return { score: Math.round(points), answered, total: ICP_CRITERIA.length };
}

// ─────────────────────────────────────────────────────────────────
// Interpretation tiers
// ─────────────────────────────────────────────────────────────────

export type IcpTier = {
  min: number;
  rating: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  nextAction: string;
  /** Tailwind classes for the score badge */
  badgeClass: string;
  /** Tailwind text color for the rating label */
  textClass: string;
  /** Solid dot / bar color for charts and indicators */
  dotClass: string;
};

export const ICP_TIERS: IcpTier[] = [
  {
    min: 90,
    rating: "Excellent Fit",
    priority: "HIGH",
    nextAction: "Highest priority — get samples in their humidor this week.",
    badgeClass: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
    textClass: "text-emerald-300",
    dotClass: "bg-emerald-400",
  },
  {
    min: 75,
    rating: "Very Good Fit",
    priority: "HIGH",
    nextAction: "Contact immediately and schedule an in-person visit.",
    badgeClass: "border-lime-500/40 bg-lime-500/10 text-lime-300",
    textClass: "text-lime-300",
    dotClass: "bg-lime-400",
  },
  {
    min: 60,
    rating: "Good Fit",
    priority: "MEDIUM",
    nextAction: "Worth pursuing — add to the visit route and follow up.",
    badgeClass: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    textClass: "text-yellow-300",
    dotClass: "bg-yellow-400",
  },
  {
    min: 40,
    rating: "Possible Fit",
    priority: "LOW",
    nextAction: "Qualify further before investing sales time.",
    badgeClass: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    textClass: "text-orange-300",
    dotClass: "bg-orange-400",
  },
  {
    min: 0,
    rating: "Poor Fit",
    priority: "LOW",
    nextAction: "Low priority — revisit only if the business changes.",
    badgeClass: "border-red-500/40 bg-red-500/10 text-red-300",
    textClass: "text-red-300",
    dotClass: "bg-red-400",
  },
];

export function icpTier(score: number): IcpTier {
  return ICP_TIERS.find((t) => score >= t.min) ?? ICP_TIERS[ICP_TIERS.length - 1]!;
}

/** Ranges used for reporting buckets, highest first. */
export const ICP_RANGES = ICP_TIERS.map((t, i) => ({
  min: t.min,
  max: i === 0 ? 100 : ICP_TIERS[i - 1]!.min - 1,
  label: i === 0 ? `${t.min}–100` : t.min === 0 ? `Below ${ICP_TIERS[i - 1]!.min}` : `${t.min}–${ICP_TIERS[i - 1]!.min - 1}`,
  rating: t.rating,
  tier: t,
}));
