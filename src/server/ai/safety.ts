/**
 * Heuristic shadowban + Meta-policy safety scoring for tobacco-adjacent content.
 * This is NOT a substitute for policy review — it's a fast first-pass signal
 * to keep the team out of obvious trouble.
 */

type Flag = {
  flag: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
};

const TOBACCO_PROMO_PATTERNS: { pattern: RegExp; severity: Flag["severity"]; label: string }[] = [
  { pattern: /\bbuy\s+(now|today)\b/i, severity: "high", label: "Direct sales CTA" },
  { pattern: /\b(discount|promo\s*code|coupon)\b/i, severity: "high", label: "Promo language" },
  { pattern: /\blimited\s+(time|stock|edition\s+available)\b/i, severity: "medium", label: "Scarcity sales language" },
  { pattern: /\$\s*\d+/i, severity: "high", label: "Pricing mention" },
  { pattern: /\bclick\s+(the\s+)?link\b/i, severity: "medium", label: "Direct CTA — risky on IG" },
  { pattern: /\bshop\s+(now|the)\b/i, severity: "high", label: "Direct shop CTA" },
  { pattern: /\border\s+yours\b/i, severity: "high", label: "Direct order language" },
  { pattern: /\b(nicotine|tobacco|smoke\s+more)\b/i, severity: "medium", label: "Tobacco keyword — flags Meta classifier" },
  { pattern: /\b(vape|vaping|e-?cig)\b/i, severity: "high", label: "Restricted product category" },
];

const ENGAGEMENT_TRAPS: { pattern: RegExp; label: string }[] = [
  { pattern: /\btag\s+a\s+friend\b/i, label: "Engagement bait — 'tag a friend'" },
  { pattern: /\bdouble\s+tap\b/i, label: "Engagement bait — 'double tap'" },
  { pattern: /\bcomment\s+below\b/i, label: "Generic engagement bait" },
  { pattern: /#follow4follow|#like4like/i, label: "Reciprocal hashtag" },
];

const ALL_CAPS_THRESHOLD = 0.25; // % of words >= 4 chars that are all-caps

export type SafetyResult = {
  score: number; // 0..1, higher = riskier
  flags: Flag[];
  bannedWordHits: string[];
};

const HARD_BANNED = [
  "limited time only",
  "buy 1 get 1",
  "guaranteed",
  "addictive",
  "best deal",
];

export function analyzeShadowbanRisk(text: string): SafetyResult {
  const flags: Flag[] = [];
  const lower = text.toLowerCase();

  for (const { pattern, severity, label } of TOBACCO_PROMO_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({
        flag: label,
        severity,
        suggestion:
          severity === "high"
            ? "Remove or rephrase — Meta will downrank tobacco-adjacent posts with direct sales language."
            : "Soften the sales language. Lead with story, not transaction.",
      });
    }
  }

  for (const { pattern, label } of ENGAGEMENT_TRAPS) {
    if (pattern.test(text)) {
      flags.push({
        flag: label,
        severity: "medium",
        suggestion: "Replace with a specific, story-rooted question.",
      });
    }
  }

  // ALL CAPS check
  const words = text.match(/[A-Za-z]{4,}/g) ?? [];
  if (words.length >= 8) {
    const caps = words.filter((w) => w === w.toUpperCase()).length;
    if (caps / words.length > ALL_CAPS_THRESHOLD) {
      flags.push({
        flag: "Excessive ALL CAPS",
        severity: "low",
        suggestion: "Reduce all-caps emphasis — feels shouty and trips engagement filters.",
      });
    }
  }

  // Excessive emoji
  const emojiCount = (text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojiCount > 8) {
    flags.push({
      flag: "Excessive emoji",
      severity: "low",
      suggestion: "Trim to 2 well-placed emojis on Instagram.",
    });
  }

  // Hashtag count (only meaningful on IG-adjacent platforms)
  const hashtags = (text.match(/#[\w]+/g) ?? []).length;
  if (hashtags > 30) {
    flags.push({
      flag: "Hashtag count exceeds 30",
      severity: "high",
      suggestion: "Instagram caps at 30. Excess is silently ignored or flagged.",
    });
  }

  const bannedWordHits = HARD_BANNED.filter((w) => lower.includes(w));
  bannedWordHits.forEach((w) =>
    flags.push({
      flag: `Forbidden phrase: "${w}"`,
      severity: "high",
      suggestion: "Replace immediately — this directly violates brand voice.",
    }),
  );

  // Score: weighted by severity, capped at 1
  const weight = { low: 0.08, medium: 0.18, high: 0.35 } as const;
  const raw = flags.reduce((sum, f) => sum + weight[f.severity], 0);
  const score = Math.min(1, raw);

  return { score, flags, bannedWordHits };
}

export function shadowbanRiskBadge(score: number): "safe" | "watch" | "risky" {
  if (score < 0.2) return "safe";
  if (score < 0.5) return "watch";
  return "risky";
}
