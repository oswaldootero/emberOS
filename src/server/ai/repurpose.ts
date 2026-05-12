import { z } from "zod";
import { openai, MODELS, estimateCostUsd } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "./brand-voice";

export const RepurposeRequestSchema = z.object({
  source: z.string().min(20).max(40000),
  sourceType: z
    .enum(["blog", "transcript", "voice_note", "caption", "freeform"])
    .default("freeform"),
  brandVoiceNotes: z.string().optional(),
});
export type RepurposeRequest = z.infer<typeof RepurposeRequestSchema>;

export const RepurposeOutputSchema = z.object({
  summary: z.string(),
  instagram_caption: z.string(),
  facebook_post: z.string(),
  telegram_post: z.string(),
  x_twitter: z.string(),
  youtube_description: z.string(),
  seo_article_outline: z.object({
    title: z.string(),
    metaDescription: z.string(),
    sections: z.array(z.object({ heading: z.string(), bullets: z.array(z.string()) })),
  }),
  email_copy: z.object({
    subject: z.string(),
    preheader: z.string(),
    body: z.string(),
  }),
  hashtags: z.array(z.string()),
  pull_quotes: z.array(z.string()),
  reel_hooks: z.array(z.string()),
});
export type RepurposeOutput = z.infer<typeof RepurposeOutputSchema>;

const SYSTEM = `You are the Heaven's Leaf repurposing engine.
Given any piece of source content (blog, transcript, voice note, caption), you produce
faithful, platform-native versions for every channel — without losing the soul of the original.

Rules:
- Stay in the Heaven's Leaf voice at all times.
- Never invent facts not present in the source.
- Each output should feel native to its platform, not a copy-paste.
- Hashtags should be tasteful (8-12), never spammy.
- Pull quotes should be design-ready (under 110 characters).
- Reel hooks should be 7-12 words, spoken aloud in the first second of a video.`;

export async function repurposeContent(req: RepurposeRequest): Promise<{
  output: RepurposeOutput;
  meta: {
    model: string;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    costUsd: number;
  };
}> {
  const model = MODELS.primary();
  const client = openai();

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: brandVoiceSystemPrompt(req.brandVoiceNotes) },
      { role: "system", content: SYSTEM },
      {
        role: "system",
        content: `Return STRICT JSON matching this shape:
{
  "summary": "1-2 sentence summary of the source",
  "instagram_caption": "...",
  "facebook_post": "...",
  "telegram_post": "...",
  "x_twitter": "<= 280 chars",
  "youtube_description": "...",
  "seo_article_outline": {
    "title": "...",
    "metaDescription": "<= 155 chars",
    "sections": [{"heading": "...", "bullets": ["..."]}]
  },
  "email_copy": { "subject": "...", "preheader": "...", "body": "..." },
  "hashtags": ["#..."],
  "pull_quotes": ["..."],
  "reel_hooks": ["..."]
}`,
      },
      {
        role: "user",
        content: `Source type: ${req.sourceType}\n\n---\n\n${req.source}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = RepurposeOutputSchema.parse(JSON.parse(raw));

  const usage = response.usage;
  const cost = usage
    ? estimateCostUsd(model, usage.prompt_tokens, usage.completion_tokens)
    : 0;

  return {
    output: parsed,
    meta: {
      model,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      costUsd: cost,
    },
  };
}
