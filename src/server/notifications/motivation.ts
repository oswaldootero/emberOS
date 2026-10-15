import "server-only";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { pushConfigured, sendPushToUser } from "./push";
import { quoteForDay, quoteLine } from "@/server/motivation/pick";
import type { Quote } from "@/server/motivation/quotes";

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export const MOTIVATION_TAG = "daily-motivation";

export function motivationPayload(q: Quote) {
  return {
    title: q.team ? "Today's fuel — from the home team" : "Today's fuel",
    body: quoteLine(q),
    url: `${appUrl()}/dashboard`,
    tag: MOTIVATION_TAG,
  };
}

/**
 * Push today's quote to every active user who hasn't turned it off and has
 * at least one subscribed device. Push only — no email. Never throws.
 */
export async function sendDailyMotivation(now = new Date()): Promise<{
  users: number;
  pushSent: number;
  removed: number;
  quote: string;
  skipped?: string;
}> {
  const q = quoteForDay(now);
  const quote = quoteLine(q);
  if (!pushConfigured()) return { users: 0, pushSent: 0, removed: 0, quote, skipped: "push not configured" };

  const users = await prisma.user.findMany({
    where: { isActive: true, dailyMotivation: true, pushSubscriptions: { some: {} } },
    select: { id: true },
  });

  const payload = motivationPayload(q);
  let pushSent = 0;
  let removed = 0;
  for (const u of users) {
    const r = await sendPushToUser(u.id, payload);
    pushSent += r.sent;
    removed += r.removed;
  }
  return { users: users.length, pushSent, removed, quote };
}
