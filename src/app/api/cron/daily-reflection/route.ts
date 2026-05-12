import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { openai, MODELS } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "@/server/ai/brand-voice";
import { sendMessage } from "@/server/integrations/telegram";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily reflection cron — invoked by Vercel cron (configured in vercel.json).
 * Posts an AI-generated reflection to the Telegram brotherhood channel.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = openai();
    const completion = await client.chat.completions.create({
      model: MODELS.primary(),
      temperature: 0.9,
      messages: [
        { role: "system", content: brandVoiceSystemPrompt() },
        {
          role: "user",
          content:
            "Write today's morning reflection for the Heaven's Leaf brotherhood. 4-6 short paragraphs. Open with an image — a porch, a long draw, a quiet road. Close with a single question.",
        },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "";

    const result = await sendMessage({ text });
    await audit("cron.daily_reflection", { diff: { ok: result.ok } });

    return Response.json({ ok: result.ok });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
