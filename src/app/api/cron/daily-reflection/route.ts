import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  generateReflection,
  type GeneratedReflection,
} from "@/server/ai/telegram-reflection";
import { sendMessage } from "@/server/integrations/telegram";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Daily Telegram cron — runs every morning. Does two things:
 *
 *  1) FIRE: any APPROVED draft whose proposedFor day is today gets sent.
 *  2) TOP UP: fills the 7-day pipeline. If any of the next 7 days doesn't
 *     have a draft yet (PENDING / APPROVED / SENT), generates one for it.
 *
 * So the founder always has a weekly view of upcoming reflections to
 * approve or skip — and once approved, drafts auto-fire on their day
 * without a second click.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1. Fire approved drafts whose day is today ──────────────
  const fired = await fireApprovedDraftsForToday();

  // ── 2. Top up to 7 days ahead ────────────────────────────────
  const created = await topUpDrafts(7);

  await audit("cron.daily_telegram", {
    diff: { fired, created },
  });

  return Response.json({ ok: true, fired, created });
}

/**
 * Allow POST too, with no auth — useful for manual triggers from server-side
 * code (admin button in the UI later) that already authenticate the caller.
 */
export async function POST(req: NextRequest) {
  return GET(req);
}

async function fireApprovedDraftsForToday(): Promise<number> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_DEFAULT_CHAT_ID) {
    return 0;
  }
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

  const due = await prisma.telegramDraft.findMany({
    where: {
      status: "APPROVED",
      proposedFor: { gte: startOfToday, lt: endOfToday },
    },
  });

  let fired = 0;
  for (const draft of due) {
    const result = await sendMessage({
      chatId: env.TELEGRAM_DEFAULT_CHAT_ID,
      text: draft.text,
      parseMode: draft.parseMode === "plain" ? undefined : (draft.parseMode as "HTML" | "MarkdownV2"),
    });
    if (result.ok) {
      await prisma.telegramDraft.update({
        where: { id: draft.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          sentToChatId: env.TELEGRAM_DEFAULT_CHAT_ID,
          externalMsgId: result.value.externalPostId,
          externalUrl: result.value.externalUrl,
        },
      });
      fired += 1;
    } else {
      console.error("[cron.daily_telegram] send failed:", result.error);
    }
  }
  return fired;
}

async function topUpDrafts(daysAhead: number): Promise<number> {
  // Build the set of days that need drafts: today + next (daysAhead-1) days,
  // not already represented by a PENDING / APPROVED / SENT draft.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + daysAhead);

  const existing = await prisma.telegramDraft.findMany({
    where: {
      proposedFor: { gte: today, lt: horizon },
      status: { in: ["PENDING", "APPROVED", "SENT"] },
    },
    select: { proposedFor: true },
  });
  const haveDay = new Set(
    existing
      .map((d) => d.proposedFor)
      .filter((d): d is Date => d != null)
      .map((d) => dayKey(d)),
  );

  const needed: Date[] = [];
  for (let i = 0; i < daysAhead; i++) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() + i);
    if (!haveDay.has(dayKey(day))) needed.push(day);
  }

  if (needed.length === 0) return 0;

  // Generate one draft per missing day in parallel
  const generations = await Promise.all(
    needed.map(async (day) => {
      try {
        const r = await generateReflection({ dayOfWeek: day.getUTCDay() });
        return { day, reflection: r };
      } catch (e) {
        console.error("[cron.daily_telegram] generation failed:", e);
        return null;
      }
    }),
  );

  let created = 0;
  for (const g of generations) {
    if (!g) continue;
    await prisma.telegramDraft.create({
      data: {
        source: "daily_reflection_cron",
        text: g.reflection.text,
        parseMode: "HTML",
        theme: g.reflection.theme,
        status: "PENDING",
        proposedFor: g.day,
        metadata: meta(g.reflection),
      },
    });
    created += 1;
  }
  return created;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function meta(r: GeneratedReflection) {
  return {
    structure: r.structure,
    register: r.register,
    promptTokens: r.promptTokens,
    completionTokens: r.completionTokens,
    model: "gpt-4o",
  };
}
