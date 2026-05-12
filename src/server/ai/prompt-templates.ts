import { z } from "zod";

export const ContentTypeEnum = z.enum([
  "caption",
  "blog_post",
  "devotional",
  "telegram_post",
  "seo_article",
  "email_newsletter",
  "video_hook",
  "podcast_outline",
  "quote_graphic",
  "carousel",
]);
export type ContentTypeKey = z.infer<typeof ContentTypeEnum>;

export const PlatformEnum = z.enum([
  "instagram",
  "facebook",
  "telegram",
  "youtube",
  "x_twitter",
  "wordpress",
  "email",
]);

export const GenerateRequestSchema = z.object({
  type: ContentTypeEnum,
  topic: z.string().min(3).max(2000),
  platform: PlatformEnum.optional(),
  wordCount: z.number().min(20).max(3000).optional(),
  tone: z
    .object({
      reflection: z.number().min(0).max(100).default(60),
      brotherhood: z.number().min(0).max(100).default(70),
      cinematic: z.number().min(0).max(100).default(80),
      spirituality: z.number().min(0).max(100).default(40),
    })
    .partial()
    .default({}),
  goals: z.array(z.string()).default([]),
  ctaIntensity: z.enum(["none", "soft", "medium"]).default("soft"),
  emotionalTone: z
    .enum(["reverent", "warm", "rugged", "contemplative", "intimate"])
    .default("contemplative"),
  brandVoiceNotes: z.string().optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

const PROMPTS: Record<
  ContentTypeKey,
  { label: string; description: string; system: string; user: (r: GenerateRequest) => string }
> = {
  caption: {
    label: "Social Caption",
    description: "Cinematic captions for Instagram, Facebook, or X.",
    system:
      "You write social captions that feel like a still frame from a film. " +
      "Output 3 distinct caption options, each separated by a line of three em-dashes '———'. " +
      "Each option should be 3-6 lines. No hashtags in the caption body — put hashtags on a final line, prefixed with 'Tags:'.",
    user: (r) =>
      `Topic / inspiration: ${r.topic}\n` +
      `Target platform: ${r.platform ?? "instagram"}\n` +
      `Emotional tone: ${r.emotionalTone}\n` +
      `CTA intensity: ${r.ctaIntensity}\n` +
      (r.goals.length ? `Goals: ${r.goals.join(", ")}\n` : "") +
      `Write three caption variants.`,
  },
  blog_post: {
    label: "Blog / Essay",
    description: "Long-form essay in the Heaven's Leaf voice.",
    system:
      "Write a blog post that reads like an essay in a thoughtful magazine. " +
      "Open with a scene, not a thesis. Use H2 subheadings sparingly. End with a closing reflection, not a CTA.",
    user: (r) =>
      `Topic: ${r.topic}\n` +
      `Target word count: ${r.wordCount ?? 900}\n` +
      `Emotional tone: ${r.emotionalTone}\n` +
      `Return in Markdown.`,
  },
  devotional: {
    label: "Devotional",
    description: "Short reflective devotional grounded in faith.",
    system:
      "Write a devotional in 4-6 short paragraphs. Open with an image or moment, then move toward a quiet spiritual truth. " +
      "If you cite Scripture, cite it accurately and only once. End with a single contemplative sentence, not a prayer or call to action.",
    user: (r) =>
      `Theme: ${r.topic}\nEmotional tone: ${r.emotionalTone}\nReturn in Markdown.`,
  },
  telegram_post: {
    label: "Telegram Post",
    description: "Brotherhood-channel message for the Telegram community.",
    system:
      "Write a Telegram post for the Heaven's Leaf brotherhood. Conversational, intimate, and grounded — like a message from one brother to another. " +
      "Use light Telegram formatting (bold, italics) sparingly. 80-180 words. " +
      "If asking for engagement, ask one specific question at the end.",
    user: (r) =>
      `Subject: ${r.topic}\nEmotional tone: ${r.emotionalTone}\nReturn plain text (Telegram-safe HTML allowed: <b>, <i>, <u>).`,
  },
  seo_article: {
    label: "SEO Article",
    description: "Long-form SEO article with structure and keywords.",
    system:
      "Write a thoroughly researched SEO article. Open with a 2-paragraph intro, then 4-6 H2 sections, then a closing reflection (not a CTA). " +
      "Naturally weave the primary keyword 3-5 times. Include one suggested meta description under 155 chars at the very end, prefixed 'META:'.",
    user: (r) =>
      `Primary topic / keyword: ${r.topic}\n` +
      `Target length: ${r.wordCount ?? 1400} words\n` +
      `Return in Markdown.`,
  },
  email_newsletter: {
    label: "Email Newsletter",
    description: "Subscriber email in the Heaven's Leaf voice.",
    system:
      "Write a newsletter email. Subject line first (prefixed 'SUBJECT:'), then the body. " +
      "Body should feel like a letter, not a promo. 250-500 words. No subject-line clickbait, no all-caps.",
    user: (r) => `Theme: ${r.topic}\nEmotional tone: ${r.emotionalTone}`,
  },
  video_hook: {
    label: "Video Hook",
    description: "Opening line + 3-beat outline for short-form video.",
    system:
      "Write 3 video hook options for short-form vertical video (Reels/Shorts/TikTok). " +
      "Each option: (1) a 7-12 word hook spoken in the first second, (2) a 3-beat outline, (3) a suggested closing line. Separate options with '———'.",
    user: (r) => `Topic: ${r.topic}\nDesired feel: ${r.emotionalTone}`,
  },
  podcast_outline: {
    label: "Podcast Outline",
    description: "Episode outline with segments and questions.",
    system:
      "Write a podcast episode outline with: title, one-paragraph synopsis, 4-6 segment headers, 2-3 guiding questions per segment, and a closing reflection prompt. Return in Markdown.",
    user: (r) => `Episode theme: ${r.topic}`,
  },
  quote_graphic: {
    label: "Quote Graphic Copy",
    description: "Short pull-quotes for graphic design.",
    system:
      "Output 6 short, design-ready quotes (each under 110 chars) suitable for a quote graphic. " +
      "Each on its own line. No quotation marks. No attribution.",
    user: (r) => `Source / theme: ${r.topic}\nEmotional tone: ${r.emotionalTone}`,
  },
  carousel: {
    label: "Carousel Copy",
    description: "Slide-by-slide copy for Instagram carousel.",
    system:
      "Write a 7-slide Instagram carousel. Format strictly as:\n" +
      "Slide 1 — Hook: <text>\nSlide 2 — <title>: <text>\n...\nSlide 7 — Close: <text>\n\n" +
      "Each slide body should be 1-3 short sentences. Slide 7 should not be a sales pitch.",
    user: (r) => `Topic: ${r.topic}\nEmotional tone: ${r.emotionalTone}`,
  },
};

export function getPromptTemplate(type: ContentTypeKey) {
  return PROMPTS[type];
}

export function listPromptTemplates() {
  return (Object.keys(PROMPTS) as ContentTypeKey[]).map((k) => ({
    key: k,
    label: PROMPTS[k].label,
    description: PROMPTS[k].description,
  }));
}

/**
 * Translate the four 0-100 tone sliders into a natural-language directive
 * the model can actually feel. Keep it short — the model gets distracted by long lists.
 */
export function toneDirective(tone: GenerateRequest["tone"]) {
  const parts: string[] = [];
  const reflection = tone.reflection ?? 60;
  const brotherhood = tone.brotherhood ?? 70;
  const cinematic = tone.cinematic ?? 80;
  const spirituality = tone.spirituality ?? 40;

  if (reflection > 70) parts.push("lean reflective and unhurried");
  else if (reflection < 30) parts.push("stay grounded and concrete, less inward");

  if (brotherhood > 70) parts.push("write to a brother, not a follower");
  if (cinematic > 70) parts.push("treat each line like a frame in a film");
  if (spirituality > 60) parts.push("allow quiet spiritual weight");
  else if (spirituality < 25) parts.push("keep faith implicit, not explicit");

  return parts.length ? `Voice directive: ${parts.join("; ")}.` : "";
}
