import { getSessionUser } from "@/lib/supabase/server";
import { checkRate } from "@/lib/rate-limit";
import { audit } from "@/server/audit";
import { generateAnalyticsInsights } from "@/server/ai/insights";
import { getLatestImports } from "@/server/analytics/imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rate = await checkRate("ai.insights", user.id, 6, "5 m");
  if (!rate.success) {
    return Response.json(
      { error: "Insight generation rate-limited. Try again in a few minutes." },
      { status: 429 },
    );
  }

  try {
    const imports = await getLatestImports();
    const result = await generateAnalyticsInsights(imports);
    await audit("ai.insights", {
      actorId: user.id,
      diff: { snapshotsAnalyzed: imports.length },
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Insight generation failed" },
      { status: 500 },
    );
  }
}
