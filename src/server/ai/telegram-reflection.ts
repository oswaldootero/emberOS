import { openai, MODELS } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "./brand-voice";

/**
 * Telegram drafting — restricted to four topic categories that match the
 * Heaven's Leaf brotherhood:
 *
 *   1) BIBLE        — short passage + grounded masculine reflection
 *   2) QUOTE        — a real man's words + light context for today
 *   3) CIGAR        — culture, history, makers, traditions, recent news
 *   4) BROTHERHOOD  — "Don't Smoke Alone" — the cost of isolation, the
 *                     pull of community, men finding each other
 *
 * The brand voice (src/server/ai/brand-voice.ts) is loaded as the system
 * prompt unchanged. This file only controls WHAT topic each draft is
 * about, not HOW it sounds.
 */

export type ReflectionCategory = "BIBLE" | "QUOTE" | "CIGAR" | "BROTHERHOOD";

const CATEGORIES: ReflectionCategory[] = [
  "BIBLE",
  "QUOTE",
  "CIGAR",
  "BROTHERHOOD",
];

const CATEGORY_LABEL: Record<ReflectionCategory, string> = {
  BIBLE: "Bible verse",
  QUOTE: "Men's quote",
  CIGAR: "Cigar culture",
  BROTHERHOOD: "Brotherhood",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Forbidden universally — no "in a world where", no LinkedIn vocabulary, etc.
const FORBIDDEN_OPENINGS = [
  "Don't start with 'In a world where' or 'Sometimes,' or 'Today is the day.'",
  "Don't use vocabulary like 'embrace', 'journey', 'unlock', 'mindset', 'grind', 'hustle'.",
  "Don't end with a question that sounds like a workshop facilitator.",
  "Don't moralize. Describe, give it weight, leave.",
  "Don't sound theatrical, cinematic, or mystical.",
  "Don't use exclamation marks in reflective content.",
];

// ────────────────────────────────────────────────────────────────────
// CATEGORY 1: BIBLE
// ────────────────────────────────────────────────────────────────────

const BIBLE_THEMES = [
  "endurance in long work (Job, Hebrews)",
  "wisdom and the cost of getting it (Proverbs, Ecclesiastes)",
  "the man who shows up when no one is watching (Psalms, James)",
  "fatherhood and what gets handed down (Proverbs, Deuteronomy)",
  "friendship between men (1 Samuel, Proverbs 27)",
  "discipline and the second wind (Hebrews 12, Galatians)",
  "the quiet strength of restraint (Proverbs, Matthew, James 1)",
  "honest grief and unrushed sadness (Psalms 6, 13, 42, Lamentations)",
  "men of integrity in compromised rooms (Daniel, Joseph, Nehemiah)",
  "the morning hours and prayer that doesn't perform (Mark 1:35, Psalm 5:3)",
];

function buildBiblePrompt(theme: string): string {
  return `Write a short Telegram post that opens with a real Bible verse and follows with a grounded reflection for men.

Theme to lean into: ${theme}

Hard rules for the verse:
- Use an actual passage, cited with book/chapter/verse (e.g. <i>Proverbs 27:17</i>)
- 1-3 verses MAX. Quote them exactly. Use ESV, NIV, or NASB phrasing.
- Italicize the verse using <i>...</i> HTML tags

Hard rules for the reflection (2-4 sentences below the verse):
- Speak directly to a man's actual day — the work, the silence, the second cup of coffee, the conversation he hasn't had yet
- Do NOT explain the verse like a sermon. No "what this means is..."
- Do NOT moralize or preach. Just sit with the text, then say one true thing
- No "let us pray." No "may the Lord bless." Plain, unhurried voice.
- End with one line that lands. Not a question, not a CTA.

Length: 60-150 words total including the verse.

${FORBIDDEN_OPENINGS.map((r) => `- ${r}`).join("\n")}`;
}

// ────────────────────────────────────────────────────────────────────
// CATEGORY 2: MEN'S QUOTES
// ────────────────────────────────────────────────────────────────────

const QUOTE_SOURCES = [
  "stoic philosophers — Marcus Aurelius, Seneca, Epictetus",
  "writers of the soil — Wendell Berry, John Steinbeck, Cormac McCarthy",
  "war and survival — Viktor Frankl, Eisenhower, Churchill, Lewis (C.S.)",
  "American grit — Lincoln, Theodore Roosevelt, Steinbeck, Faulkner",
  "fathers and sons writers — Wendell Berry, Marilynne Robinson's letters, James Baldwin's father essays",
  "craftsmen and makers — woodworkers, blacksmiths, sailors, carpenters",
  "Hemingway, but only the quiet lines about discipline and silence (not the macho ones)",
  "G.K. Chesterton, Eugene Peterson, Henri Nouwen",
  "old generals — Patton on patience, Lee on duty",
  "athletes who became teachers — John Wooden, Phil Jackson",
];

const QUOTE_THEMES = [
  "the long work no one applauds",
  "showing up for the people who depend on you",
  "the difference between courage and noise",
  "discipline as freedom, not punishment",
  "what to do when you don't feel like it",
  "carrying grief without dramatizing it",
  "patience as a masculine virtue",
  "the cost of doing the right thing slowly",
  "fatherhood and inheritance",
  "the price of being a man of your word",
];

function buildQuotePrompt(theme: string, sources: string): string {
  return `Write a short Telegram post built around a real quote from a man worth quoting.

Theme to land: ${theme}

Pull from one of these wells (vary every time, don't always pick the same source):
${sources}

Hard rules for the quote:
- The quote MUST be real and attributable. Do NOT invent quotes.
- 1-3 sentences of actual quoted text in <i>"..."</i>
- Attribution on its own line, like: — <b>Marcus Aurelius</b>
- If you're not certain of exact wording, paraphrase and clearly mark it: <i>"He wrote, essentially, that..."</i>

Hard rules for the wrap (2-3 sentences after the quote):
- Don't explain the quote. Don't say "what he meant was..."
- Connect it to something concrete a man might be doing today
- Plain language. No motivational-speaker enthusiasm.
- End with one line that doesn't try to wrap a bow on it

Length: 50-130 words total.

What to AVOID:
- Tony Robbins, Tim Ferriss, James Clear, motivational LinkedIn quotes — none of that
- Anything that smells like a self-help book
- Generic "be a man" macho vocabulary
${FORBIDDEN_OPENINGS.map((r) => `- ${r}`).join("\n")}`;
}

// ────────────────────────────────────────────────────────────────────
// CATEGORY 3: CIGAR CULTURE + NEWS
// ────────────────────────────────────────────────────────────────────

const CIGAR_ANGLES = [
  "the story behind a specific blender or family (Padron, Fuente, Plasencia, Pepín García, AJ Fernandez, Tatuaje, Drew Estate)",
  "regional terroir — why Estelí ligero hits like that, why Cibao Valley sun-grown is different, why Cuba's Vuelta Abajo is mythic",
  "tradition: how torcedores actually work, why a triple-cap matters, what entubado vs accordion really does to the burn",
  "tobacco curing — air-cured vs sun-cured, the months between barn and box, what changes in fermentation",
  "history of the cigar — Columbus and the Taíno, the Cuban embargo's accidental Nicaraguan boom, the rise of the Honduran masters",
  "a famous smoker — Churchill, Hemingway, Twain, Freud, JFK on the Petit Upmann story before signing the embargo",
  "vitola anatomy — why a Lonsdale smokes differently than a Robusto with the same blend",
  "recent / recent-ish industry news — a new boutique, a release worth knowing, a maker who passed, a regulatory shift in the FDA's stance, a Habanos S.A. announcement",
  "the lounge culture — what makes a great lounge, the unwritten rules, the way men greet each other across smoke",
  "pairing — bourbon vs rum vs coffee vs port, why a maduro asks for something different than a Connecticut wrapper",
];

function buildCigarPrompt(angle: string): string {
  return `Write a short Telegram post that teaches the brotherhood something about cigar culture.

Angle for today: ${angle}

Hard rules:
- Be SPECIFIC. Name the family, the region, the blend, the year, the person. Generic facts are not interesting.
- Only state facts you are confident are accurate. If unsure, hedge ("commonly attributed to," "the family tells the story that...")
- 4-7 short sentences. Not a wall of text.
- Don't promote any product. This is education, not sales.
- Don't try to be poetic — let the fact be the gift
- If it's news-adjacent, anchor it in time ("last fall," "in 2024," etc.) so readers know what era

Tone:
- Knowledgeable but not professorial — like a friend who's gone deep on this and wants to share
- Direct sentences. Short paragraphs.
- Light HTML formatting OK: <b>name</b>, <i>blend name</i>

What to AVOID:
- Generic "cigars bring people together" wrap-ups — the brotherhood already knows this
- Marketing copy phrases ("luxurious experience," "rich heritage")
- ${FORBIDDEN_OPENINGS.join(" ")}

Length: 70-180 words.`;
}

// ────────────────────────────────────────────────────────────────────
// CATEGORY 4: BROTHERHOOD — "Don't Smoke Alone" + community
// ────────────────────────────────────────────────────────────────────

const BROTHERHOOD_THEMES = [
  "the silent slide into isolation that most men don't notice until something cracks",
  "the invitation that changes everything — 'come by tomorrow night'",
  "the friend who calls when no one else does",
  "the third place — why a lounge / a porch / a kitchen table matters more than people admit",
  "mentorship as showing up, not lecturing — sitting through the silence with someone",
  "letting another man see the real version of you over a long burn",
  "the brother who said yes after being invited eight times — and what unlocked",
  "fatherhood: bringing your son into the room where the men gather",
  "strangers who become brothers around the same fire",
  "the real cost of going through hard seasons alone",
  "the quiet miracle of being known",
  "cigars as the excuse — friendship is the meeting",
  "asking better questions: not 'how are you' but 'what's actually heavy right now'",
  "the unspoken rule of the lounge — no fixing, just witnessing",
  "what a man owes the men around him — and what he owes himself",
];

function buildBrotherhoodPrompt(theme: string): string {
  return `Write a short Telegram post about brotherhood, community, and the cost of going through life alone. This is the heart of Heaven's Leaf — the "Don't Smoke Alone" ethos.

Theme to land: ${theme}

Hard rules:
- Concrete. Specific moments. Specific actions. Not abstract philosophy.
- Speak to the man reading it as if you're sitting across from him.
- Reference real things: a phone in a pocket, a porch in October, a chair pulled up to a fire, a coffee already cold.
- Show what brotherhood looks like in practice — don't define it. The reader knows.
- If you mention "Don't Smoke Alone," do it once and let it land. Don't repeat it.
- One concrete call to action is allowed and encouraged — but it must be small and human:
  · "Text one brother this week, just to ask how he's actually doing."
  · "Pull up a chair for someone tomorrow night."
  · "Stop being the man who almost reached out."
  Never an ad-style CTA. Never "join our community" or "RSVP for the next event."

Length: 60-150 words.

Voice rules:
- Don't perform brotherhood — describe it.
- Don't moralize. Don't say "we need each other more than ever."
- Don't romanticize the lounge — let the everydayness of it carry the weight.
- Don't write about the brand. Write about the men.
- End with one line that lands quietly.

${FORBIDDEN_OPENINGS.map((r) => `- ${r}`).join("\n")}`;
}

// ────────────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────────────

export type ReflectionInput = {
  /** 0=Sun..6=Sat — used for light variation only; category is now random */
  dayOfWeek: number;
  /** Override the category if you want a specific one */
  categoryOverride?: ReflectionCategory;
};

export type GeneratedReflection = {
  text: string;
  /** The category label — surfaces as the "theme" badge on draft cards */
  theme: string;
  category: ReflectionCategory;
  structure: string;
  register: string;
  promptTokens?: number;
  completionTokens?: number;
};

export async function generateReflection(
  input: ReflectionInput,
): Promise<GeneratedReflection> {
  const category = input.categoryOverride ?? pick(CATEGORIES);
  let userPrompt: string;
  let theme: string;

  if (category === "BIBLE") {
    theme = pick(BIBLE_THEMES);
    userPrompt = buildBiblePrompt(theme);
  } else if (category === "QUOTE") {
    theme = pick(QUOTE_THEMES);
    const sources = pick(QUOTE_SOURCES);
    userPrompt = buildQuotePrompt(theme, sources);
  } else if (category === "BROTHERHOOD") {
    theme = pick(BROTHERHOOD_THEMES);
    userPrompt = buildBrotherhoodPrompt(theme);
  } else {
    theme = pick(CIGAR_ANGLES);
    userPrompt = buildCigarPrompt(theme);
  }

  const client = openai();
  const response = await client.chat.completions.create({
    model: MODELS.primary(),
    temperature: 0.85,
    presence_penalty: 0.5,
    frequency_penalty: 0.3,
    messages: [
      { role: "system", content: brandVoiceSystemPrompt() },
      { role: "user", content: userPrompt },
    ],
  });

  return {
    text: response.choices[0]?.message?.content?.trim() ?? "",
    // Surface a readable label on the draft card
    theme: `${CATEGORY_LABEL[category]} · ${shorten(theme, 50)}`,
    category,
    structure: category,
    register: theme,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  };
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Variants — N parallel generations, each forced to a different category
 * so the user has range, not three rewrites of the same idea.
 */
export async function generateReflectionVariants(
  input: ReflectionInput,
  count = 3,
): Promise<GeneratedReflection[]> {
  // Cycle the categories so a 3-variant request gets one of each
  const shuffled = [...CATEGORIES].sort(() => Math.random() - 0.5);
  const tasks: Promise<GeneratedReflection>[] = [];
  for (let i = 0; i < count; i++) {
    tasks.push(
      generateReflection({
        ...input,
        categoryOverride: shuffled[i % shuffled.length],
      }),
    );
  }
  return Promise.all(tasks);
}
