import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSecret, sendMessage } from "@/server/integrations/telegram";
import { brandVoiceSystemPrompt } from "@/server/ai/brand-voice";
import { openai, MODELS } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telegram webhook handler.
 * - Verifies the X-Telegram-Bot-Api-Secret-Token header
 * - Records new members and messages
 * - Routes /commands to the Brotherhood Bot
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!verifyWebhookSecret(secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return Response.json({ ok: true });

  // New chat member
  if (update.message?.new_chat_members) {
    for (const m of update.message.new_chat_members) {
      await upsertMember(m);
      await sendMessage({
        chatId: String(update.message.chat.id),
        text: `Welcome to the brotherhood, <b>${m.first_name ?? "friend"}</b>. Pull up a chair. The fire is steady here.`,
      });
    }
    return Response.json({ ok: true });
  }

  // Regular message
  if (update.message?.text) {
    const member = await upsertMember(update.message.from);
    await prisma.telegramMessage
      .create({
        data: {
          telegramMsgId: String(update.message.message_id),
          chatId: String(update.message.chat.id),
          memberId: member?.id ?? null,
          text: update.message.text,
          sentAt: new Date(update.message.date * 1000),
        },
      })
      .catch(() => undefined);

    // Commands
    const text = update.message.text as string;
    if (text.startsWith("/")) {
      await handleCommand(text, String(update.message.chat.id));
    }
  }

  return Response.json({ ok: true });
}

async function upsertMember(from: {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
  last_name?: string;
}) {
  if (!from) return null;
  try {
    return await prisma.telegramMember.upsert({
      where: { telegramId: String(from.id) },
      update: {
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        lastActivityAt: new Date(),
        messageCount: { increment: 1 },
      },
      create: {
        telegramId: String(from.id),
        isBot: from.is_bot ?? false,
        username: from.username,
        firstName: from.first_name,
        lastName: from.last_name,
        lastActivityAt: new Date(),
      },
    });
  } catch {
    return null;
  }
}

async function handleCommand(text: string, chatId: string) {
  const [cmd] = text.split(" ");

  if (cmd === "/start" || cmd === "/help") {
    await sendMessage({
      chatId,
      text: [
        "Welcome to the <b>Heaven's Leaf Brotherhood</b>.",
        "",
        "Commands:",
        "/reflect — today's reflection",
        "/smoke — log a cigar check-in",
        "/events — upcoming community events",
        "/verse — Sunday-morning scripture prompt",
      ].join("\n"),
    });
    return;
  }

  if (cmd === "/reflect") {
    try {
      const client = openai();
      const r = await client.chat.completions.create({
        model: MODELS.fast(),
        temperature: 0.85,
        messages: [
          { role: "system", content: brandVoiceSystemPrompt() },
          {
            role: "user",
            content:
              "Write a 4-sentence reflection appropriate for the Heaven's Leaf Telegram brotherhood right now. End with a single contemplative question.",
          },
        ],
      });
      const reply = r.choices[0]?.message?.content ?? "";
      await sendMessage({ chatId, text: reply });
    } catch {
      await sendMessage({
        chatId,
        text: "The fire is quiet right now — try again in a moment.",
      });
    }
    return;
  }

  if (cmd === "/smoke") {
    await sendMessage({
      chatId,
      text: "Cigar logged. May this draw be slower than the last. 🪶",
    });
    return;
  }
}

// Reject GET — webhook is POST-only
export function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
