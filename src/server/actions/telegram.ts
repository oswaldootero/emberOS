"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  sendMessage,
  sendPoll,
  isConfigured as telegramIsConfigured,
} from "@/server/integrations/telegram";
import { generateReflection } from "@/server/ai/telegram-reflection";
import { env } from "@/lib/env";

const BroadcastSchema = z.object({
  text: z.string().min(1).max(4096), // Telegram caps at 4096 chars
  parseMode: z.enum(["HTML", "MarkdownV2", "plain"]).default("HTML"),
  silent: z.boolean().default(false),
  chatId: z.string().optional(),
});

const PollSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  chatId: z.string().optional(),
});

export type BroadcastResult =
  | {
      ok: true;
      externalPostId: string;
      externalUrl?: string;
      chatId: string;
    }
  | { ok: false; error: string };

export async function sendBroadcast(input: unknown): Promise<BroadcastResult> {
  const user = await requireUser();

  if (!telegramIsConfigured()) {
    return {
      ok: false,
      error:
        "Telegram bot is not configured. Set TELEGRAM_BOT_TOKEN in Vercel.",
    };
  }

  const parsed = BroadcastSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }

  const d = parsed.data;
  const chatId = d.chatId || env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!chatId) {
    return {
      ok: false,
      error: "No chat ID configured. Set TELEGRAM_DEFAULT_CHAT_ID in Vercel.",
    };
  }

  // Telegram doesn't have a "plain" mode in its API — we just omit parseMode
  const result = await sendMessage({
    chatId,
    text: d.text,
    parseMode: d.parseMode === "plain" ? undefined : d.parseMode,
    silent: d.silent,
  });

  if (!result.ok) {
    await audit("telegram.broadcast_failed", {
      actorId: user.id,
      diff: { chatId, parseMode: d.parseMode, errorCode: result.error.code },
    });
    return { ok: false, error: result.error.message };
  }

  await audit("telegram.broadcast", {
    actorId: user.id,
    entityType: "TelegramMessage",
    entityId: result.value.externalPostId,
    diff: {
      chatId,
      parseMode: d.parseMode,
      silent: d.silent,
      charCount: d.text.length,
    },
  });

  revalidatePath("/telegram");

  return {
    ok: true,
    externalPostId: result.value.externalPostId,
    externalUrl: result.value.externalUrl,
    chatId,
  };
}

export async function sendBroadcastPoll(
  input: unknown,
): Promise<BroadcastResult> {
  const user = await requireUser();

  if (!telegramIsConfigured()) {
    return { ok: false, error: "Telegram bot is not configured." };
  }

  const parsed = PollSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Poll needs a question and at least 2 options." };
  }

  const d = parsed.data;
  const chatId = d.chatId || env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!chatId) {
    return { ok: false, error: "No chat ID configured." };
  }

  const r = await sendPoll(d.question, d.options, chatId);
  if (!r.ok) {
    return { ok: false, error: r.error.message };
  }

  await audit("telegram.poll", {
    actorId: user.id,
    diff: { chatId, question: d.question, optionCount: d.options.length },
  });
  revalidatePath("/telegram");

  return {
    ok: true,
    externalPostId: "",
    chatId,
  };
}

// ─────────────────────────────────────────────────────────────────
// Draft management — review-before-send workflow
// ─────────────────────────────────────────────────────────────────

const SendDraftSchema = z.object({
  draftId: z.string(),
  editedText: z.string().min(1).max(4096).optional(),
});

export async function sendDraft(input: unknown): Promise<BroadcastResult> {
  const user = await requireUser();
  const parsed = SendDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const draft = await prisma.telegramDraft.findUnique({
    where: { id: parsed.data.draftId },
  });
  if (!draft) return { ok: false, error: "Draft not found." };
  if (draft.status !== "PENDING") {
    return { ok: false, error: `Already ${draft.status.toLowerCase()}.` };
  }

  if (!telegramIsConfigured()) {
    return { ok: false, error: "Telegram bot is not configured." };
  }

  const chatId = env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!chatId) return { ok: false, error: "No chat ID configured." };

  const text = parsed.data.editedText ?? draft.text;

  const result = await sendMessage({
    chatId,
    text,
    parseMode: draft.parseMode === "plain" ? undefined : (draft.parseMode as "HTML" | "MarkdownV2"),
  });

  if (!result.ok) {
    await audit("telegram.draft_send_failed", {
      actorId: user.id,
      entityType: "TelegramDraft",
      entityId: draft.id,
      diff: { errorCode: result.error.code },
    });
    return { ok: false, error: result.error.message };
  }

  await prisma.telegramDraft.update({
    where: { id: draft.id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      sentToChatId: chatId,
      externalMsgId: result.value.externalPostId,
      externalUrl: result.value.externalUrl,
      // Preserve the actually-sent text if it was edited
      text,
    },
  });

  await audit("telegram.draft_sent", {
    actorId: user.id,
    entityType: "TelegramDraft",
    entityId: draft.id,
    diff: { edited: text !== draft.text, theme: draft.theme },
  });

  revalidatePath("/telegram");
  return {
    ok: true,
    externalPostId: result.value.externalPostId,
    externalUrl: result.value.externalUrl,
    chatId,
  };
}

export async function discardDraft(draftId: string): Promise<BroadcastResult> {
  const user = await requireUser();
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { ok: false, error: "Draft not found." };

  await prisma.telegramDraft.update({
    where: { id: draftId },
    data: { status: "DISCARDED" },
  });

  await audit("telegram.draft_discarded", {
    actorId: user.id,
    entityType: "TelegramDraft",
    entityId: draftId,
  });

  revalidatePath("/telegram");
  return {
    ok: true,
    externalPostId: "",
    chatId: "",
  };
}

export async function regenerateDraft(draftId: string): Promise<BroadcastResult> {
  const user = await requireUser();
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { ok: false, error: "Draft not found." };
  if (draft.status !== "PENDING") {
    return { ok: false, error: "Can only regenerate pending drafts." };
  }

  const dayOfWeek = new Date().getUTCDay();
  try {
    const fresh = await generateReflection({ dayOfWeek });
    await prisma.telegramDraft.update({
      where: { id: draftId },
      data: {
        text: fresh.text,
        theme: fresh.theme,
        metadata: {
          structure: fresh.structure,
          register: fresh.register,
          regeneratedAt: new Date().toISOString(),
          regeneratedBy: user.id,
        },
      },
    });
    await audit("telegram.draft_regenerated", {
      actorId: user.id,
      entityType: "TelegramDraft",
      entityId: draftId,
    });
    revalidatePath("/telegram");
    return { ok: true, externalPostId: "", chatId: "" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Regeneration failed",
    };
  }
}

export async function approveDraft(
  draftId: string,
  editedText?: string,
): Promise<BroadcastResult> {
  const user = await requireUser();
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { ok: false, error: "Draft not found." };
  if (draft.status === "SENT") {
    return { ok: false, error: "Already sent — can't re-approve." };
  }

  await prisma.telegramDraft.update({
    where: { id: draftId },
    data: {
      status: "APPROVED",
      text: editedText ?? draft.text,
    },
  });
  await audit("telegram.draft_approved", {
    actorId: user.id,
    entityType: "TelegramDraft",
    entityId: draftId,
    diff: {
      edited: editedText != null,
      proposedFor: draft.proposedFor?.toISOString() ?? null,
    },
  });
  revalidatePath("/telegram");
  return { ok: true, externalPostId: draftId, chatId: "" };
}

export async function unapproveDraft(draftId: string): Promise<BroadcastResult> {
  const user = await requireUser();
  const draft = await prisma.telegramDraft.findUnique({ where: { id: draftId } });
  if (!draft) return { ok: false, error: "Draft not found." };
  if (draft.status !== "APPROVED") {
    return { ok: false, error: "Not currently approved." };
  }
  await prisma.telegramDraft.update({
    where: { id: draftId },
    data: { status: "PENDING" },
  });
  await audit("telegram.draft_unapproved", {
    actorId: user.id,
    entityType: "TelegramDraft",
    entityId: draftId,
  });
  revalidatePath("/telegram");
  return { ok: true, externalPostId: draftId, chatId: "" };
}

export async function generateFreshDraft(): Promise<BroadcastResult> {
  const user = await requireUser();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  try {
    const fresh = await generateReflection({ dayOfWeek: today.getUTCDay() });
    const draft = await prisma.telegramDraft.create({
      data: {
        source: "manual",
        text: fresh.text,
        parseMode: "HTML",
        theme: fresh.theme,
        status: "PENDING",
        proposedFor: today, // ← critical: without this it never shows in the weekly view
        metadata: {
          structure: fresh.structure,
          register: fresh.register,
          requestedBy: user.id,
        },
      },
    });
    await audit("telegram.draft_created", {
      actorId: user.id,
      entityType: "TelegramDraft",
      entityId: draft.id,
    });
    revalidatePath("/telegram");
    return { ok: true, externalPostId: draft.id, chatId: "" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed",
    };
  }
}

/**
 * Fill the week — generate one draft for each of the next 7 days that
 * doesn't already have a PENDING / APPROVED / SENT draft. Mirrors what
 * the daily cron does so the user can prime the pipeline without waiting
 * for tomorrow morning.
 */
export async function topUpWeek(): Promise<
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string }
> {
  const user = await requireUser();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 7);

  try {
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
        .map((d) => d.toISOString().slice(0, 10)),
    );

    const missing: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() + i);
      if (!haveDay.has(day.toISOString().slice(0, 10))) missing.push(day);
    }

    if (missing.length === 0) {
      return { ok: true, created: 0, skipped: 7 };
    }

    const generations = await Promise.all(
      missing.map(async (day) => {
        try {
          const r = await generateReflection({ dayOfWeek: day.getUTCDay() });
          return { day, r };
        } catch {
          return null;
        }
      }),
    );

    let created = 0;
    for (const g of generations) {
      if (!g) continue;
      await prisma.telegramDraft.create({
        data: {
          source: "manual_week_topup",
          text: g.r.text,
          parseMode: "HTML",
          theme: g.r.theme,
          status: "PENDING",
          proposedFor: g.day,
          metadata: {
            structure: g.r.structure,
            register: g.r.register,
            requestedBy: user.id,
          },
        },
      });
      created += 1;
    }

    await audit("telegram.week_topup", {
      actorId: user.id,
      diff: { created, skipped: 7 - missing.length },
    });
    revalidatePath("/telegram");

    return { ok: true, created, skipped: 7 - missing.length };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Top-up failed",
    };
  }
}
