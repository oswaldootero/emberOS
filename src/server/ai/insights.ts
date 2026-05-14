import { openai, MODELS } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "./brand-voice";
import type { ImportedSnapshot } from "@/server/analytics/imports";

/**
 * Sends a compact summary of imported analytics to the model and asks for
 * "what's working / what's not" in the Heaven's Leaf voice. Keeps the
 * payload small by sending only top entities + totals, not raw rows.
 */
export async function generateAnalyticsInsights(
  snapshots: ImportedSnapshot[],
): Promise<{ markdown: string; promptTokens?: number; completionTokens?: number }> {
  if (snapshots.length === 0) {
    return {
      markdown:
        "_No imports yet. Upload a CSV from Google Analytics, Search Console, Instagram, Facebook, or YouTube to see insights here._",
    };
  }

  const summary = snapshots
    .map((s) => {
      const top = (s.topEntities ?? []).slice(0, 8);
      return [
        `## ${s.source} — ${s.reportType}`,
        s.label ? `Label: ${s.label}` : null,
        s.periodStart && s.periodEnd
          ? `Period: ${s.periodStart.slice(0, 10)} → ${s.periodEnd.slice(0, 10)}`
          : null,
        `Rows: ${s.rowCount}`,
        `Totals: ${JSON.stringify(s.totals)}`,
        top.length > 0
          ? `Top entities (first 8):\n${top.map((t, i) => `  ${i + 1}. ${JSON.stringify(t)}`).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const system = brandVoiceSystemPrompt(
    "When analyzing performance data, be specific, concrete, and actionable. Cite numbers when you make a claim. Don't be vague. The reader is a busy operator who needs to know what to do next.",
  );

  const userPrompt = `You're reviewing the latest analytics for Heaven's Leaf across multiple platforms.
The data is below. Produce a concise, plain-English performance review.

Required structure (use Markdown, keep each section to 3-6 bullets):

## ✓ What's working
Specific wins — content, channels, queries, sources. Cite numbers.

## ✗ What's not working
Honest gaps — declines, low CTR, weak engagement, missing audiences. Cite numbers.

## ⤴ What to try next
3-5 concrete, named experiments grounded in the data above. Each should reference a specific finding.

## Numbers worth remembering
A short bulleted dashboard of the most important 4-6 metrics across all platforms.

Tone: reflective, grounded, like a friend who happens to be a great analyst. Never hype.

---

DATA:

${summary}`;

  const client = openai();
  const response = await client.chat.completions.create({
    model: MODELS.primary(),
    temperature: 0.6,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    markdown: response.choices[0]?.message?.content ?? "",
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  };
}
