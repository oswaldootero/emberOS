import { env } from "@/lib/env";
import { ok, err, type Outcome, type PublishResult } from "./types";

const API = (method: string) =>
  `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

export type TgSendOpts = {
  chatId?: string;
  text: string;
  parseMode?: "HTML" | "MarkdownV2";
  silent?: boolean;
  replyMarkup?: object;
};

async function tg<T>(method: string, body: object): Promise<Outcome<T>> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return err("tg.unconfigured", "TELEGRAM_BOT_TOKEN is not set");
  }
  try {
    const res = await fetch(API(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!json.ok) {
      return err(
        `tg.${json.error_code}`,
        json.description ?? "Telegram API error",
        (json.error_code ?? 0) >= 500,
        json,
      );
    }
    return ok(json.result as T);
  } catch (e) {
    return err(
      "tg.network",
      e instanceof Error ? e.message : "Network error",
      true,
      e,
    );
  }
}

export async function sendMessage(
  opts: TgSendOpts,
): Promise<Outcome<PublishResult>> {
  const chatId = opts.chatId ?? env.TELEGRAM_DEFAULT_CHAT_ID;
  if (!chatId) return err("tg.no_chat", "No chat ID configured");

  const result = await tg<{ message_id: number; chat: { id: number; username?: string } }>(
    "sendMessage",
    {
      chat_id: chatId,
      text: opts.text,
      parse_mode: opts.parseMode ?? "HTML",
      disable_notification: opts.silent,
      reply_markup: opts.replyMarkup,
    },
  );
  if (!result.ok) return result;
  const url = result.value.chat.username
    ? `https://t.me/${result.value.chat.username}/${result.value.message_id}`
    : undefined;
  return ok({
    externalPostId: String(result.value.message_id),
    externalUrl: url,
    publishedAt: new Date(),
    raw: result.value,
  });
}

export async function sendPoll(
  question: string,
  options: string[],
  chatId?: string,
) {
  return tg("sendPoll", {
    chat_id: chatId ?? env.TELEGRAM_DEFAULT_CHAT_ID,
    question,
    options: JSON.stringify(options),
    is_anonymous: false,
  });
}

export async function setWebhook(url: string, secret?: string) {
  return tg("setWebhook", {
    url,
    secret_token: secret ?? env.TELEGRAM_WEBHOOK_SECRET,
    drop_pending_updates: true,
  });
}

export async function getMe() {
  return tg<{ id: number; username: string; first_name: string }>("getMe", {});
}

/**
 * Verifies the incoming webhook secret. Telegram sends it in
 * X-Telegram-Bot-Api-Secret-Token header.
 */
export function isConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN);
}

export function verifyWebhookSecret(header: string | null): boolean {
  if (!env.TELEGRAM_WEBHOOK_SECRET) return false;
  return header === env.TELEGRAM_WEBHOOK_SECRET;
}
