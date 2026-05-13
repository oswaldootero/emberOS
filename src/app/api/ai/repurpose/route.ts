import { NextRequest } from "next/server";
import { repurposeContent, RepurposeRequestSchema } from "@/server/ai/repurpose";
import { checkRate } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/supabase/server";
import { audit } from "@/server/audit";
import { captureServer, flushPostHog } from "@/lib/posthog/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const identifier = user?.id ?? req.headers.get("x-forwarded-for") ?? "anon";
  const rate = await checkRate("ai.repurpose", identifier, 10, "1 m");
  if (!rate.success) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = RepurposeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await repurposeContent(parsed.data);
    await audit("ai.repurpose", {
      actorId: user?.id ?? null,
      diff: { sourceType: parsed.data.sourceType, ...result.meta },
    });
    captureServer(user?.id, "ai.repurpose", {
      sourceType: parsed.data.sourceType,
      sourceLength: parsed.data.source.length,
      model: result.meta.model,
      totalTokens: result.meta.totalTokens,
      costUsd: result.meta.costUsd,
    });
    await flushPostHog();
    return Response.json(result);
  } catch (err) {
    console.error("[ai.repurpose] failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
