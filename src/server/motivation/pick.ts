import { ALL_QUOTES, GENERAL_QUOTES, MIAMI_QUOTES, type Quote } from "./quotes";

/**
 * One quote per calendar day, the same for everyone, no DB.
 *
 * The rotation is a seeded shuffle of the general bank with a Miami
 * (Dolphins / Hurricanes) quote slotted in after every three general ones,
 * so the home teams show up about twice a week instead of their ~1-in-9
 * share of the bank. Repeats only once the whole rotation is exhausted.
 */

/** App-wide day boundary for "today's quote". Matches the User.timezone default. */
export const QUOTE_TIMEZONE = "America/Los_Angeles";

const SEED = 0x5ca1ab1e;
const MIAMI_EVERY = 4; // every 4th slot is a Miami quote

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

let rotation: Quote[] | null = null;

/** The full ordered rotation (built once per process). */
export function quoteRotation(): Quote[] {
  if (rotation) return rotation;
  const general = seededShuffle(GENERAL_QUOTES, SEED);
  const miami = seededShuffle(MIAMI_QUOTES, SEED ^ 0xd01f);
  const out: Quote[] = [];
  let g = 0;
  let m = 0;
  while (g < general.length) {
    if (out.length % MIAMI_EVERY === MIAMI_EVERY - 1 && miami.length > 0) {
      out.push(miami[m++ % miami.length]);
    } else {
      out.push(general[g++]);
    }
  }
  rotation = out;
  return out;
}

/** Calendar day in `tz` as a YYYY-MM-DD string. */
export function dayKeyInZone(now: Date, tz = QUOTE_TIMEZONE): string {
  return now.toLocaleDateString("en-CA", { timeZone: tz });
}

/** Days since 1970-01-01 for the calendar day in `tz`. */
export function dayNumberInZone(now: Date, tz = QUOTE_TIMEZONE): number {
  const [y, m, d] = dayKeyInZone(now, tz).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Today's quote (deterministic for the calendar day in the app timezone). */
export function quoteForDay(now = new Date(), tz = QUOTE_TIMEZONE): Quote {
  const r = quoteRotation();
  const i = ((dayNumberInZone(now, tz) % r.length) + r.length) % r.length;
  return r[i];
}

/** "— Don Shula, Dolphins coach" */
export function attribution(q: Quote): string {
  return q.role ? `${q.author}, ${q.role}` : q.author;
}

/** Push-friendly body: “quote” — Author, role */
export function quoteLine(q: Quote): string {
  return `“${q.text}” — ${attribution(q)}`;
}

export const BANK_SIZE = ALL_QUOTES.length;
