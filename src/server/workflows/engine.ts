import "server-only";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";
import { openai, MODELS, estimateCostUsd } from "@/lib/openai";
import { brandVoiceSystemPrompt } from "@/server/ai/brand-voice";
import type {
  Workflow,
  WorkflowTrigger,
  AIJobStatus,
} from "@prisma/client";

/**
 * Workflow engine — runs all ACTIVE workflows matching a given trigger
 * with a JSON payload describing what happened. Each step is executed
 * sequentially, with its outcome appended to the WorkflowExecution log.
 */

export type StepOutcome = {
  stepIndex: number;
  type: string;
  status: "ok" | "skipped" | "error";
  output?: unknown;
  error?: string;
  durationMs: number;
};

export type StepHandler = (args: {
  step: WorkflowStep;
  payload: Record<string, unknown>;
  context: Record<string, unknown>;
}) => Promise<{ output?: unknown; skipped?: boolean }>;

export type WorkflowStep = {
  type: string;
  config?: Record<string, unknown>;
};

const STEP_HANDLERS: Record<string, StepHandler> = {
  /**
   * Generate a Telegram brotherhood draft about the trigger payload.
   * If the payload mentions a WP article, the AI is asked to write a
   * short, brotherhood-voice teaser pointing readers to the piece.
   */
  "telegram.draft_about_payload": async ({ payload, step }) => {
    const articleTitle =
      (payload.title as string | undefined) ??
      (payload.contentTitle as string | undefined) ??
      "the new piece";
    const articleUrl =
      (payload.url as string | undefined) ??
      (payload.externalUrl as string | undefined) ??
      "";
    const excerpt =
      (payload.excerpt as string | undefined) ??
      (payload.summary as string | undefined) ??
      "";

    const customPrompt =
      (step.config?.prompt as string | undefined) ?? undefined;

    const client = openai();
    const model = MODELS.primary();

    const r = await client.chat.completions.create({
      model,
      temperature: 0.85,
      messages: [
        { role: "system", content: brandVoiceSystemPrompt() },
        {
          role: "user",
          content:
            customPrompt ??
            `A new long-form piece just went up on the Heaven's Leaf blog:

Title: ${articleTitle}
${excerpt ? `Excerpt: ${excerpt}\n` : ""}${articleUrl ? `URL: ${articleUrl}` : ""}

Write a short Telegram message for the brotherhood pointing them to it.

Hard rules:
- 50-120 words
- Don't summarize the piece — make them curious. Quote one line if it helps.
- One link at the end: <a href="${articleUrl}">read it here</a>
- No "check this out", no "you'll love it", no marketing-speak
- The brotherhood will read it if you make it worth their time, not if you sell it

HTML formatting allowed: <b>, <i>, <a href>`,
        },
      ],
    });

    const text = r.choices[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("AI returned empty draft");

    const draft = await prisma.telegramDraft.create({
      data: {
        source: "workflow",
        text,
        parseMode: "HTML",
        theme: `From article: ${articleTitle.slice(0, 60)}`,
        status: "PENDING",
        proposedFor: new Date(),
        metadata: {
          model,
          triggerPayload: payload,
          tokens: r.usage,
        } as object,
      },
    });

    // Persist as an AIJob too so cost dashboards stay accurate
    if (r.usage) {
      await prisma.aIJob
        .create({
          data: {
            status: "SUCCEEDED" as AIJobStatus,
            model,
            input: { workflow: true, articleTitle, articleUrl } as object,
            rawText: text,
            promptTokens: r.usage.prompt_tokens,
            completionTokens: r.usage.completion_tokens,
            totalTokens: r.usage.total_tokens,
            costUsd: estimateCostUsd(
              model,
              r.usage.prompt_tokens,
              r.usage.completion_tokens,
            ),
            startedAt: new Date(),
            finishedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }

    return { output: { draftId: draft.id, theme: draft.theme } };
  },

  /**
   * Generate an Instagram caption draft in the brand voice from the same
   * payload. Stored as a ContentPiece (status DRAFT) so it surfaces on
   * future content workflows.
   */
  "instagram.caption_draft": async ({ payload, step }) => {
    const articleTitle =
      (payload.title as string | undefined) ?? "the new piece";
    const articleUrl =
      (payload.url as string | undefined) ??
      (payload.externalUrl as string | undefined) ??
      "";
    const excerpt =
      (payload.excerpt as string | undefined) ??
      (payload.summary as string | undefined) ??
      "";

    const client = openai();
    const model = MODELS.primary();
    const r = await client.chat.completions.create({
      model,
      temperature: 0.85,
      messages: [
        { role: "system", content: brandVoiceSystemPrompt() },
        {
          role: "user",
          content: (step.config?.prompt as string | undefined) ??
            `Write an Instagram caption to accompany the article below.

Article title: ${articleTitle}
${excerpt ? `Excerpt: ${excerpt}\n` : ""}${articleUrl ? `Link: ${articleUrl}` : ""}

3-6 lines. Carry the brand voice. End on a quiet line — not a CTA.
Add a final line with 4-6 relevant hashtags (lowercase, no spam).`,
        },
      ],
    });
    const text = r.choices[0]?.message?.content?.trim() ?? "";

    const piece = await prisma.contentPiece.create({
      data: {
        title: `IG caption — ${articleTitle.slice(0, 80)}`,
        type: "CAPTION",
        status: "DRAFT",
        body: text,
        excerpt: excerpt.slice(0, 200),
        aiGenerated: true,
        authorId: await getSystemAuthorId(),
        metadata: { sourcePayload: payload } as object,
      },
    });

    return { output: { contentId: piece.id } };
  },

  /**
   * No-op step useful for testing/logging — appends a note to the
   * execution log without doing anything else.
   */
  "log.note": async ({ step }) => {
    return { output: { note: step.config?.note ?? "(no note)" } };
  },
};

/**
 * Find an author for system-generated content. Uses the first ADMIN user;
 * if none exists yet (early setup), throws.
 */
async function getSystemAuthorId(): Promise<string> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });
  if (!admin)
    throw new Error("No admin user found to attribute workflow output to");
  return admin.id;
}

/**
 * Run every active workflow whose trigger matches, with the given payload.
 * Errors in one workflow don't stop others. Each execution is logged to
 * WorkflowExecution.
 */
export async function fireTrigger(
  trigger: WorkflowTrigger,
  payload: Record<string, unknown>,
): Promise<{ workflowsFired: number }> {
  const workflows = await prisma.workflow.findMany({
    where: { trigger, isActive: true },
  });

  if (workflows.length === 0) return { workflowsFired: 0 };

  await Promise.all(
    workflows.map((wf) => executeWorkflow(wf, payload).catch((e) => {
      console.error(`[workflow ${wf.id}] failed:`, e);
    })),
  );

  return { workflowsFired: workflows.length };
}

export async function executeWorkflow(
  workflow: Workflow,
  payload: Record<string, unknown>,
  triggeredById?: string | null,
): Promise<{ executionId: string; outcomes: StepOutcome[] }> {
  const startedAt = new Date();

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      status: "RUNNING",
      triggerPayload: payload as object,
      triggeredById: triggeredById ?? null,
      startedAt,
    },
  });

  const steps = parseSteps(workflow.steps);
  const outcomes: StepOutcome[] = [];
  const context: Record<string, unknown> = {};

  let overallStatus: AIJobStatus = "SUCCEEDED";

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const handler = STEP_HANDLERS[step.type];
    const stepStart = Date.now();

    if (!handler) {
      outcomes.push({
        stepIndex: i,
        type: step.type,
        status: "skipped",
        error: `No handler registered for step type "${step.type}"`,
        durationMs: 0,
      });
      continue;
    }

    try {
      const result = await handler({ step, payload, context });
      outcomes.push({
        stepIndex: i,
        type: step.type,
        status: result.skipped ? "skipped" : "ok",
        output: result.output,
        durationMs: Date.now() - stepStart,
      });
      // Propagate step output into context for downstream steps
      if (result.output && typeof result.output === "object") {
        Object.assign(context, { [`step${i}`]: result.output });
      }
    } catch (e) {
      outcomes.push({
        stepIndex: i,
        type: step.type,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
        durationMs: Date.now() - stepStart,
      });
      overallStatus = "FAILED";
      // Continue running remaining steps; they may not depend on this one
    }
  }

  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: overallStatus,
      stepLog: outcomes as unknown as object,
      errorMessage:
        outcomes.find((o) => o.status === "error")?.error ?? null,
      finishedAt: new Date(),
    },
  });

  await audit("workflow.executed", {
    entityType: "Workflow",
    entityId: workflow.id,
    diff: {
      trigger: workflow.trigger,
      status: overallStatus,
      stepCount: steps.length,
      durationMs: Date.now() - startedAt.getTime(),
    },
  });

  return { executionId: execution.id, outcomes };
}

function parseSteps(steps: unknown): WorkflowStep[] {
  if (!Array.isArray(steps)) return [];
  return steps
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => ({
      type: String(s.type ?? ""),
      config: (s.config as Record<string, unknown> | undefined) ?? undefined,
    }));
}

export function listKnownStepTypes(): { type: string; description: string }[] {
  return [
    {
      type: "telegram.draft_about_payload",
      description:
        "Create a Telegram brotherhood draft about the triggering content (e.g. a published article).",
    },
    {
      type: "instagram.caption_draft",
      description:
        "Generate an Instagram caption in the brand voice and save it to the content library as a DRAFT.",
    },
    {
      type: "log.note",
      description: "No-op — useful for testing or annotating execution logs.",
    },
  ];
}
