import { NextRequest } from "next/server";
import { ImageRequestSchema, generateImage } from "@/server/ai/image";
import { checkRate } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/supabase/server";
import { audit } from "@/server/audit";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const identifier = user?.id ?? req.headers.get("x-forwarded-for") ?? "anon";

  const rate = await checkRate("ai.image", identifier, 8, "1 m");
  if (!rate.success) {
    return Response.json(
      { error: "Image generation rate limit. Slow your draw." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = ImageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  try {
    const image = await generateImage(parsed.data);
    const durationMs = Date.now() - startedAt;

    // Persist for token/cost tracking. gpt-image-1 priced roughly $0.04-0.19
    // per image depending on size/quality — we estimate a flat value here.
    try {
      await prisma.aIJob.create({
        data: {
          status: "SUCCEEDED",
          model: image.model,
          input: parsed.data as unknown as object,
          rawText: image.promptUsed,
          costUsd: estimateImageCost(parsed.data.size, parsed.data.quality),
          durationMs,
          startedAt: new Date(startedAt),
          finishedAt: new Date(),
          triggeredById: user?.id ?? null,
        },
      });
    } catch {
      // ignore DB errors
    }

    await audit("ai.image", {
      actorId: user?.id ?? null,
      diff: {
        size: parsed.data.size,
        quality: parsed.data.quality,
        promptLength: parsed.data.prompt.length,
      },
    });

    return Response.json({
      dataUrl: image.dataUrl,
      promptUsed: image.promptUsed,
      model: image.model,
      size: image.size,
      durationMs,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }
}

/**
 * Rough cost estimate for gpt-image-1 (USD). These match OpenAI's published
 * per-image pricing tiers. Adjust if/when pricing changes.
 */
function estimateImageCost(size: string, quality: string): number {
  const matrix: Record<string, Record<string, number>> = {
    "1024x1024": { low: 0.011, medium: 0.042, high: 0.167, auto: 0.042 },
    "1536x1024": { low: 0.016, medium: 0.063, high: 0.25, auto: 0.063 },
    "1024x1536": { low: 0.016, medium: 0.063, high: 0.25, auto: 0.063 },
  };
  return matrix[size]?.[quality] ?? 0.05;
}
