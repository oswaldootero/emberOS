/**
 * Handcrafted reply pools for the Brotherhood Bot. Each pool is rotated
 * randomly so no two members see the same canned line back-to-back, and the
 * bot stops sounding like a bot.
 *
 * Edit these in source — they're brand voice, not configuration. Adding a
 * 7th smoke reply is a 30-second PR.
 */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const WELCOMES = [
  // Name-aware — uses HTML bold for the first name
  (name: string) =>
    `Welcome in, <b>${name}</b>. Don't say hello yet. Just sit a minute. The room finds you.`,
  (name: string) =>
    `${name}, you're here. That's enough for tonight. Tell us about something you almost said out loud this week, when you're ready.`,
  (name: string) =>
    `<b>${name}</b>. There's a chair. Take it. We don't perform here — we just keep the fire going.`,
  (name: string) =>
    `Welcome, ${name}. The men in this room are mostly listeners. So you don't have to introduce yourself if you don't want to. We'll know you soon enough.`,
  (name: string) =>
    `${name} just walked in. <i>Good.</i> The brotherhood gets a little richer when one more honest man joins it.`,
  (name: string) =>
    `Pull up, ${name}. No agenda here. Just men trying to live a slower kind of life.`,
];

const SMOKE_REPLIES = [
  "Logged. Slow the draw. The hurry will still be there tomorrow.",
  "Cigar noted. May the next forty minutes belong to no one.",
  "On the books. The world won't notice you stepped out. That's the point.",
  "Logged. Whatever's loud in your head — try letting one ash fall before answering it.",
  "Got it. A brother somewhere is doing the same thing right now. That's not nothing.",
  "Marked. The work will keep. The quiet won't.",
  "Logged. The first inch of ash always feels longer than it is.",
  "On the ledger. Don't check your phone for the first half. See what shows up.",
];

const HELP_INTROS = [
  "The brotherhood, in commands:",
  "Here's what the bot knows:",
  "Quick reference:",
  "If you need to find me:",
];

const ERRORS_REFLECT = [
  "The fire is quiet right now — try again in a moment.",
  "Couldn't pull a reflection just now. The room's a little smoky on my end. Try again shortly.",
  "Something didn't catch. Give it a minute and ask again.",
];

export function pickWelcome(firstName?: string): string {
  const name = firstName ?? "friend";
  return pick(WELCOMES)(name);
}

export function pickSmokeReply(): string {
  return pick(SMOKE_REPLIES);
}

export function pickHelpIntro(): string {
  return pick(HELP_INTROS);
}

export function pickReflectError(): string {
  return pick(ERRORS_REFLECT);
}
