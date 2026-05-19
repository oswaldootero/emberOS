import { openai, MODELS } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "./brand-voice";

/**
 * Daily reflection prompt library — varies by day of week + theme +
 * structure + emotional register so the brotherhood doesn't read 7 days
 * of structurally identical posts.
 */

const THEMES_BY_DOW: Record<number, string[]> = {
  0: ["sabbath", "stillness", "the hand that lets go", "rest as resistance"],
  1: ["the week as a path", "choosing your fire", "intention vs ambition"],
  2: ["the unseen work", "private rituals", "the second half of a craft"],
  3: ["mentors and fathers", "what we inherit", "what we hand down"],
  4: ["friendship as discipline", "the table we keep", "showing up"],
  5: ["anticipation", "the slow Friday", "watching the light change"],
  6: ["the road", "gathering", "stories at the porch", "the long draw"],
};

const STRUCTURES = [
  // Image → quiet shift inward → single line
  "Open with a single concrete scene (4-7 words). One short paragraph painting the image. Then move inward in one or two sentences. End with one line that lands like a closing door.",

  // Address the brother directly
  "Speak directly to one brother — 'you' singular. Three short paragraphs. The first names where they probably are right now (the porch, the desk, the road). The second asks something quiet. The third blesses.",

  // Borrowed metaphor from craft
  "Build the whole post around one craft metaphor — coffee, leather, a knife, an axe, a saddle, a candle, an old letter. Don't say cigar. Let the brotherhood read between the lines.",

  // Question → small story → return to question
  "Start with a question worth sitting with. Tell a 2-3 sentence story that answers obliquely. Return to the question changed.",

  // Single image, no narrative
  "No story. Just an image held still — like a polaroid. 4-6 sentences total. The kind of post a brother screenshots and keeps.",

  // Two sentences only
  "Two sentences. Maximum. The first sets a scene. The second cracks it open. That's the whole post.",

  // Confession
  "Write as if confessing something small but true. Not theatrical. The kind of thing you'd say in the dark at a campfire. End without resolution.",
];

const REGISTERS = [
  "reverent but not pious",
  "quiet, almost whispered",
  "wry and grounded",
  "tender, like writing to your son",
  "unhurried, like the third hour of a porch conversation",
];

const FORBIDDEN = [
  "Don't start with 'In a world where' or 'Sometimes,'",
  "Don't end with a question that sounds like a workshop facilitator",
  "Don't use 'embrace,' 'journey,' 'unlock,' 'mindset,' or any LinkedIn vocabulary",
  "Don't say 'brothers' more than once if at all — overusing it makes it feel performative",
  "Don't quote scripture unless it's woven invisibly into the prose",
  "Don't moralize — describe, then leave",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type ReflectionInput = {
  /** 0=Sun, 1=Mon, …, 6=Sat */
  dayOfWeek: number;
  /** Optional: override the theme picker */
  themeOverride?: string;
  /** Optional: override the structure */
  structureOverride?: string;
};

export type GeneratedReflection = {
  text: string;
  theme: string;
  structure: string;
  register: string;
  promptTokens?: number;
  completionTokens?: number;
};

/**
 * Generate ONE reflection. Call multiple times to get variants.
 */
export async function generateReflection(
  input: ReflectionInput,
): Promise<GeneratedReflection> {
  const themes = THEMES_BY_DOW[input.dayOfWeek] ?? THEMES_BY_DOW[0];
  const theme = input.themeOverride ?? pick(themes);
  const structure = input.structureOverride ?? pick(STRUCTURES);
  const register = pick(REGISTERS);

  const system = brandVoiceSystemPrompt(
    `You are writing a daily reflection for the Heaven's Leaf brotherhood
Telegram channel. The brotherhood is small but devoted. They are not
followers — they are friends who happen to follow.

ABSOLUTE rules for this post:
${FORBIDDEN.map((r) => `- ${r}`).join("\n")}

Length: between 60 and 180 words. Sometimes 30 is right. Never more than 200.
HTML formatting allowed: <b>, <i>, <u>, but use them rarely. Italics are for
private weight, not for emphasis.`,
  );

  const userPrompt = `Write today's reflection.

Theme to lean into: ${theme}
Structural choice: ${structure}
Emotional register: ${register}

Do not announce the theme. Let it live inside the prose. Do not start with
"Today" or any time-stamp word. Begin with the image or the line — don't
warm up.`;

  const client = openai();
  const response = await client.chat.completions.create({
    model: MODELS.primary(),
    temperature: 0.95, // high — we want range, not safety
    presence_penalty: 0.6, // discourage stock phrasing
    frequency_penalty: 0.3, // less repetition within the post
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    text: response.choices[0]?.message?.content?.trim() ?? "",
    theme,
    structure,
    register,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  };
}

/**
 * Generate N varied reflections in parallel — each gets a different
 * theme + structure + register so the user has real choices, not slight
 * variations of one idea.
 */
export async function generateReflectionVariants(
  input: ReflectionInput,
  count = 3,
): Promise<GeneratedReflection[]> {
  const themes = THEMES_BY_DOW[input.dayOfWeek] ?? THEMES_BY_DOW[0];

  // Shuffle structures + themes so each variant gets a different combination
  const usedThemes = new Set<string>();
  const usedStructures = new Set<string>();

  const tasks: Promise<GeneratedReflection>[] = [];
  for (let i = 0; i < count; i++) {
    const remainingThemes = themes.filter((t) => !usedThemes.has(t));
    const theme = remainingThemes.length > 0 ? pick(remainingThemes) : pick(themes);
    usedThemes.add(theme);

    const remainingStructures = STRUCTURES.filter((s) => !usedStructures.has(s));
    const structure =
      remainingStructures.length > 0 ? pick(remainingStructures) : pick(STRUCTURES);
    usedStructures.add(structure);

    tasks.push(
      generateReflection({
        ...input,
        themeOverride: theme,
        structureOverride: structure,
      }),
    );
  }

  return Promise.all(tasks);
}
