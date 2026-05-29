"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/server/auth";
import { audit } from "@/server/audit";
import { executeWorkflow } from "@/server/workflows/engine";

const StepSchema = z.object({
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  trigger: z.enum([
    "CONTENT_PUBLISHED",
    "MANUAL",
    "SCHEDULED",
    "TELEGRAM_MESSAGE",
    "WEBHOOK",
    "RSS_UPDATE",
  ]),
  steps: z.array(StepSchema).min(1),
  isActive: z.boolean().default(true),
});

export type WorkflowResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createWorkflow(input: unknown): Promise<WorkflowResult> {
  const user = await requireUser();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }
  const d = parsed.data;

  const workflow = await prisma.workflow.create({
    data: {
      name: d.name,
      description: d.description,
      trigger: d.trigger,
      steps: d.steps as object,
      isActive: d.isActive,
      ownerId: user.id,
    },
  });

  await audit("workflow.created", {
    actorId: user.id,
    entityType: "Workflow",
    entityId: workflow.id,
    diff: { trigger: d.trigger, stepCount: d.steps.length },
  });

  revalidatePath("/workflows");
  return { ok: true, id: workflow.id };
}

export async function toggleWorkflow(
  id: string,
  isActive: boolean,
): Promise<WorkflowResult> {
  const user = await requireUser();
  const wf = await prisma.workflow.findUnique({ where: { id } });
  if (!wf) return { ok: false, error: "Workflow not found." };

  await prisma.workflow.update({
    where: { id },
    data: { isActive },
  });
  await audit("workflow.toggled", {
    actorId: user.id,
    entityType: "Workflow",
    entityId: id,
    diff: { isActive },
  });
  revalidatePath("/workflows");
  return { ok: true, id };
}

export async function deleteWorkflow(id: string): Promise<WorkflowResult> {
  await requireAdmin();
  await prisma.workflow.delete({ where: { id } });
  revalidatePath("/workflows");
  return { ok: true, id };
}

export async function runWorkflowNow(
  id: string,
  payload?: Record<string, unknown>,
): Promise<WorkflowResult> {
  const user = await requireUser();
  const wf = await prisma.workflow.findUnique({ where: { id } });
  if (!wf) return { ok: false, error: "Workflow not found." };

  try {
    const { executionId } = await executeWorkflow(
      wf,
      payload ?? { source: "manual_run", triggeredBy: user.id },
      user.id,
    );
    revalidatePath("/workflows");
    return { ok: true, id: executionId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Execution failed",
    };
  }
}
