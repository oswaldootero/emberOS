import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { generateReflectionVariants } from "@/server/ai/telegram-reflection";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/**
 * Daily reflection cron — generates 3 varied drafts and saves them to
 * the database for HUMAN REVIEW. Nothing posts automatically anymore.
 *
 * The brotherhood gets messages the founder actually approved. The AI
 * proposes, the human curates.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const dayOfWeek = today.getUTCDay();

  try {
    const variants = await generateReflectionVariants(
      { dayOfWeek },
      3, // three drafts to choose from
    );

    const proposedFor = new Date(today);
    proposedFor.setUTCHours(14, 0, 0, 0); // 14:00 UTC = mid-morning PT

    const drafts = await Promise.all(
      variants.map((v) =>
        prisma.telegramDraft.create({
          data: {
            source: "daily_reflection_cron",
            text: v.text,
            parseMode: "HTML",
            theme: v.theme,
            status: "PENDING",
            proposedFor,
            metadata: {
              structure: v.structure,
              register: v.register,
              promptTokens: v.promptTokens,
              completionTokens: v.completionTokens,
              model: "gpt-4o",
              dayOfWeek,
            },
          },
        }),
      ),
    );

    await audit("cron.daily_reflection_drafts", {
      diff: { count: drafts.length, dayOfWeek },
    });

    return Response.json({
      ok: true,
      drafted: drafts.length,
      themes: variants.map((v) => v.theme),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }
}
