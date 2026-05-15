import { prisma } from "@/lib/prisma";
import { checkRate } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/supabase/server";
import { audit } from "@/server/audit";
import { generateDailyIntentions } from "@/server/ai/daily-intentions";
import { getLatestImports } from "@/server/analytics/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rate = await checkRate("ai.daily_intentions", user.id, 12, "1 h");
  if (!rate.success) {
    return Response.json(
      { error: "Slow down — try again in a few minutes." },
      { status: 429 },
    );
  }

  try {
    const [imports, telegramMembers, telegramMsgs7d, contentPiecesTotal, aiJobs7d, scheduledCount] =
      await Promise.all([
        getLatestImports(),
        prisma.telegramMember.count().catch(() => 0),
        prisma.telegramMessage
          .count({
            where: { sentAt: { gte: new Date(Date.now() - 7 * 86400000) } },
          })
          .catch(() => 0),
        prisma.contentPiece.count().catch(() => 0),
        prisma.aIJob
          .count({
            where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
          })
          .catch(() => 0),
        prisma.scheduledPost
          .count({
            where: { status: { in: ["QUEUED", "PROCESSING"] } },
          })
          .catch(() => 0),
      ]);

    const result = await generateDailyIntentions({
      imports,
      internalSummary: {
        telegramMembers,
        telegramMsgs7d,
        contentPiecesTotal,
        aiJobs7d,
        scheduledCount,
      },
    });

    await audit("ai.daily_intentions", {
      actorId: user.id,
      diff: { snapshotsAnalyzed: imports.length },
    });

    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }
}
