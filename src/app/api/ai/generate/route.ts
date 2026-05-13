import { NextRequest } from "next/server";
import { openai, MODELS, estimateCostUsd } from "@/lib/openai";
import {
  GenerateRequestSchema,
  getPromptTemplate,
  toneDirective,
} from "@/server/ai/prompt-templates";
import { brandVoiceSystemPrompt } from "@/server/ai/brand-voice";
import { checkRate } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { captureServer, flushPostHog } from "@/lib/posthog/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  const identifier = user?.id ?? req.headers.get("x-forwarded-for") ?? "anon";

  const rate = await checkRate("ai.generate", identifier, 30, "1 m");
  if (!rate.success) {
    return Response.json(
      { error: "Too many generations. Slow your draw — try again in a moment." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const reqData = parsed.data;
  const template = getPromptTemplate(reqData.type);

  const model = MODELS.primary();
  const client = openai();

  // Create an AIJob row up front so the user can attribute usage later
  let jobId: string | null = null;
  try {
    const job = await prisma.aIJob.create({
      data: {
        status: "RUNNING",
        model,
        input: reqData as unknown as object,
        startedAt: new Date(),
      },
    });
    jobId = job.id;
  } catch {
    // Continue without DB (db not provisioned yet)
  }

  const tone = toneDirective(reqData.tone);
  const messages = [
    { role: "system" as const, content: brandVoiceSystemPrompt(reqData.brandVoiceNotes) },
    { role: "system" as const, content: template.system },
    ...(tone ? [{ role: "system" as const, content: tone }] : []),
    { role: "user" as const, content: template.user(reqData) },
  ];

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.85,
    stream: true,
    stream_options: { include_usage: true },
  });

  const encoder = new TextEncoder();
  let buffer = "";
  let promptTokens = 0;
  let completionTokens = 0;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            buffer += delta;
            controller.enqueue(encoder.encode(delta));
          }
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        // Best-effort: persist final job state
        if (jobId) {
          try {
            await prisma.aIJob.update({
              where: { id: jobId },
              data: {
                status: "SUCCEEDED",
                rawText: buffer,
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
                costUsd: estimateCostUsd(model, promptTokens, completionTokens),
                finishedAt: new Date(),
                triggeredById: user?.id ?? null,
              },
            });
            await audit("ai.generate", {
              actorId: user?.id ?? null,
              entityType: "AIJob",
              entityId: jobId,
              diff: { type: reqData.type, model },
            });
            captureServer(user?.id, "ai.generate", {
              contentType: reqData.type,
              platform: reqData.platform,
              emotionalTone: reqData.emotionalTone,
              ctaIntensity: reqData.ctaIntensity,
              model,
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
              costUsd: estimateCostUsd(model, promptTokens, completionTokens),
            });
            await flushPostHog();
          } catch {
            // ignore
          }
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Job-Id": jobId ?? "",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
