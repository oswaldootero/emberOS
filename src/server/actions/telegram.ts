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
  const dayOfWeek = new Date().getUTCDay();

  try {
    const fresh = await generateReflection({ dayOfWeek });
    const draft = await prisma.telegramDraft.create({
      data: {
        source: "manual",
        text: fresh.text,
        parseMode: "HTML",
        theme: fresh.theme,
        status: "PENDING",
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
