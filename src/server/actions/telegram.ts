"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import {
  sendMessage,
  sendPoll,
  isConfigured as telegramIsConfigured,
} from "@/server/integrations/telegram";
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
