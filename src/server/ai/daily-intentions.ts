import { openai, MODELS } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "./brand-voice";
import type { ImportedSnapshot } from "@/server/analytics/imports";

/**
 * Today's intentions — a daily gap analysis for a BOUTIQUE cigar brand.
 *
 * Calibrated for small-but-devoted audiences. The prompt explicitly avoids
 * mass-market growth-hacking advice and pushes toward depth-over-volume.
 */
export async function generateDailyIntentions(opts: {
  imports: ImportedSnapshot[];
  internalSummary: {
    telegramMembers: number;
    telegramMsgs7d: number;
    contentPiecesTotal: number;
    aiJobs7d: number;
    scheduledCount: number;
  };
}): Promise<{
  markdown: string;
  generatedAt: string;
  hasData: boolean;
}> {
  const { imports, internalSummary } = opts;
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const dow = today.getDay(); // 0=Sun, 6=Sat

  const dayContext = [
    dow === 0 && "Sunday — sabbath rhythm. Reflective content lands hardest.",
    dow === 1 && "Monday — community returning to the week. Lead with intention.",
    dow === 2 && "Tuesday — quiet middle. Replies and 1:1 outreach do more than posts.",
    dow === 3 && "Wednesday — mid-week. Good day for stories, weak for big launches.",
    dow === 4 && "Thursday — anticipation of weekend. Tease, don't announce.",
    dow === 5 && "Friday — energy is rising. Lounge / gathering content peaks.",
    dow === 6 && "Saturday — peak engagement window. Photos from real moments work.",
  ]
    .filter(Boolean)
    .join(" ");

  // Compact data summary for the model
  const ig = imports.find((i) => i.reportType === "instagram_content");
  const fb = imports.find((i) => i.reportType === "facebook_content");
  const gsc = imports.find((i) => i.reportType === "gsc_queries");
  const ga4 = imports.find((i) => i.reportType === "ga4_traffic_acquisition");

  const dataSnapshot = [
    `Today: ${dayName}`,
    `Context: ${dayContext}`,
    `Internal:`,
    `  - ${internalSummary.telegramMembers} brotherhood members (Telegram), ${internalSummary.telegramMsgs7d} msgs last 7d`,
    `  - ${internalSummary.contentPiecesTotal} total content pieces in library`,
    `  - ${internalSummary.aiJobs7d} AI generations this week`,
    `  - ${internalSummary.scheduledCount} posts scheduled`,
    ig &&
      `Instagram (last import, ${ig.rowCount} posts):\n  - reach total: ${ig.totals.reach}\n  - engagement total: ${(Number(ig.totals.reactions) || 0) + (Number(ig.totals.comments) || 0) + (Number(ig.totals.shares) || 0) + (Number(ig.totals.saves) || 0)}\n  - top post: ${JSON.stringify(ig.topEntities[0] ?? null)}`,
    fb &&
      `Facebook (last import, ${fb.rowCount} posts):\n  - reach total: ${fb.totals.reach}\n  - engagement total: ${(Number(fb.totals.reactions) || 0) + (Number(fb.totals.comments) || 0) + (Number(fb.totals.shares) || 0)}\n  - top post: ${JSON.stringify(fb.topEntities[0] ?? null)}`,
    gsc &&
      `Search (last import, ${gsc.rowCount} queries):\n  - top query: ${JSON.stringify(gsc.topEntities[0] ?? null)}`,
    ga4 &&
      `Web (last import):\n  - top source: ${JSON.stringify(ga4.topEntities[0] ?? null)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const hasAnyData = imports.length > 0 || internalSummary.telegramMembers > 0;

  const system = brandVoiceSystemPrompt(
    `You are advising the founder of HEAVEN'S LEAF — a BOUTIQUE cigar brand. Critical context:

- Audience is small but devoted. Treat each follower as a real person, not a statistic.
- VOLUME isn't the goal. DEPTH is. We're not chasing virality.
- 1:1 outreach beats broadcast. A thoughtful reply to one regular outperforms a perfect post.
- Authenticity and ritual are the moats. Don't recommend "viral hooks" or chase trends.
- Gathering moments (rides, lounge nights, dinners) build the brand more than algorithm optimization.
- Strategic adjacency matters: whiskey, leather, motorcycles, books, faith communities — not generic "engagement bait."
- We are explicitly NOT trying to grow fast. We're trying to grow right.

NEVER recommend:
- "Post 3x/day," "go viral," "use trending audio," "tag a friend"
- Paid ads as a primary lever
- Influencer outreach as a primary tactic
- Anything that sounds like a Hootsuite blog post

ALWAYS prefer:
- Specific 1:1 community actions (reply to X, DM Y, write a personal note to Z)
- Ritual-building moments
- Content that deepens existing relationships rather than chasing new ones`,
  );

  const userPrompt = `Generate today's intentions for the Heaven's Leaf operator.

This is a DAILY GAP ANALYSIS — what specifically should they do TODAY (most actions doable in 5-30 minutes) to deepen engagement with their existing brotherhood. Cite specific data points from below when relevant.

Structure (use Markdown):

## Today's intentions
3-5 specific actions for today. Each as a numbered item with:
- Bold action title (5-10 words)
- One sentence of detail
- If citing data, include the actual number/post/query

## Why today
2-3 sentences on what's standing out in the data right now — the moment they should be paying attention to.

## A line worth posting today
One single, ready-to-post short reflection (under 200 chars) in the Heaven's Leaf voice that they could share on Instagram or Telegram. No hashtags. Cinematic, unhurried.

---

${
  hasAnyData
    ? `Data snapshot:\n\n${dataSnapshot}`
    : "Note: No analytics imports yet. Lead with foundational community-building actions and reference what they can build with what they have."
}`;

  const client = openai();
  const response = await client.chat.completions.create({
    model: MODELS.primary(),
    temperature: 0.75,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    markdown: response.choices[0]?.message?.content ?? "",
    generatedAt: today.toISOString(),
    hasData: hasAnyData,
  };
}
