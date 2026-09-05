/**
 * Pure helpers for the Today board — no database. The board is a list of
 * things that need a human today, ranked by urgency, plus a small sales
 * pulse. Future task/calendar modules add ActionItems the same way.
 */

export type Urgency = "overdue" | "today" | "soon" | "info";

export type ActionKind =
  | "invoice"
  | "customer"
  | "prospect"
  | "task"
  | "influencer"
  | "reorder"
  | "mention"
  | "stock"
  | "social";

export type ActionItem = {
  id: string;
  kind: ActionKind;
  title: string;
  detail: string | null;
  href: string;
  /** ISO date when time-bound, else null */
  due: string | null;
  urgency: Urgency;
};

const URGENCY_RANK: Record<Urgency, number> = { overdue: 0, today: 1, soon: 2, info: 3 };

/** Classify a due date relative to now. Day boundaries use the caller's TZ via Date. */
export function urgencyFor(due: Date | null, now: Date, soonDays = 3): Urgency {
  if (!due) return "info";
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday.getTime() + 86400000);
  if (due < startToday) return "overdue";
  if (due < endToday) return "today";
  if (due.getTime() - now.getTime() <= soonDays * 86400000) return "soon";
  return "info";
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Overdue first, then today, soon, info; ties by due date ascending, then title. */
export function sortActions(items: ActionItem[]): ActionItem[] {
  return [...items].sort((x, y) => {
    const r = URGENCY_RANK[x.urgency] - URGENCY_RANK[y.urgency];
    if (r !== 0) return r;
    if (x.due && y.due) return x.due.localeCompare(y.due);
    if (x.due) return -1;
    if (y.due) return 1;
    return x.title.localeCompare(y.title);
  });
}

export type HashtagPick = { tag: string; why: string; use: "post" | "monitor" | "both"; volume: "high" | "medium" | "niche" };

/**
 * The one hashtag to follow today: prefer a monitoring tag that isn't the
 * noisiest (niche/medium beats high), then anything monitor-flagged, then
 * the first tag.
 */
export function pickFeaturedHashtag(tags: HashtagPick[]): HashtagPick | null {
  if (tags.length === 0) return null;
  const monitor = tags.filter((t) => t.use === "monitor" || t.use === "both");
  const pool = monitor.length ? monitor : tags;
  return pool.find((t) => t.volume === "niche") ?? pool.find((t) => t.volume === "medium") ?? pool[0]!;
}

/** Last `count` calendar months ending this month, as yyyy-mm keys with labels. */
export function monthBuckets(now: Date, count = 6): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-US", { month: "short" }),
    });
  }
  return out;
}

export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
