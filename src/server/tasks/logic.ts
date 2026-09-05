/**
 * Pure task helpers — dates are day-granular and stored as UTC midnight.
 */
import type { ActionItem } from "@/server/dashboard/today-logic";

export type TaskLike = {
  id: string;
  title: string;
  dueAt: Date | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  linkedLabel: string | null;
  href: string;
};

/** "2026-09-05" → UTC midnight Date; anything else → null. */
export function parseDueDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return isNaN(d.getTime()) ? null : d;
}

export function utcDayOf(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Whole days from today's UTC day to the due day (negative = overdue). */
export function daysUntilDue(dueAt: Date, now: Date): number {
  return Math.round((utcDayOf(dueAt).getTime() - utcDayOf(now).getTime()) / 86400000);
}

export function dueLabel(dueAt: Date | null, now: Date): string {
  if (!dueAt) return "No date";
  const d = daysUntilDue(dueAt, now);
  if (d < -1) return `${-d} days overdue`;
  if (d === -1) return "Yesterday";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d <= 6) return dueAt.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  return dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function taskUrgency(dueAt: Date | null, now: Date): ActionItem["urgency"] {
  if (!dueAt) return "info";
  const d = daysUntilDue(dueAt, now);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= 3) return "soon";
  return "info";
}

export function taskToAction(t: TaskLike, now: Date): ActionItem {
  const bits = [t.linkedLabel, t.priority === "HIGH" ? "High priority" : null, t.dueAt ? dueLabel(t.dueAt, now) : null].filter(Boolean);
  return {
    id: `task-${t.id}`,
    kind: "task",
    title: t.title,
    detail: bits.length ? bits.join(" · ") : "Task",
    href: t.href,
    due: t.dueAt ? t.dueAt.toISOString() : null,
    // Tasks without a date still deserve a spot today, below dated work.
    urgency: t.dueAt ? taskUrgency(t.dueAt, now) : t.priority === "HIGH" ? "soon" : "info",
  };
}

/** Group due/overdue tasks per assignee for one reminder each. */
export function groupReminders<T extends { assigneeId: string | null; dueAt: Date | null }>(
  tasks: T[],
  now: Date,
): Map<string, { overdue: T[]; today: T[] }> {
  const out = new Map<string, { overdue: T[]; today: T[] }>();
  for (const t of tasks) {
    if (!t.assigneeId || !t.dueAt) continue;
    const d = daysUntilDue(t.dueAt, now);
    if (d > 0) continue;
    const g = out.get(t.assigneeId) ?? { overdue: [], today: [] };
    (d < 0 ? g.overdue : g.today).push(t);
    out.set(t.assigneeId, g);
  }
  return out;
}

export function reminderCopy(g: { overdue: unknown[]; today: unknown[] }): { title: string; body: string } {
  const parts = [
    g.today.length ? `${g.today.length} due today` : null,
    g.overdue.length ? `${g.overdue.length} overdue` : null,
  ].filter(Boolean);
  const total = g.today.length + g.overdue.length;
  return {
    title: total === 1 ? "1 task needs you" : `${total} tasks need you`,
    body: parts.join(" · "),
  };
}
