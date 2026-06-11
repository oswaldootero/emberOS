"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";

const ScenarioSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  isDefault: z.boolean().optional().default(false),

  wholesaleBoxPrice: z.number().positive(),
  cigarsPerBox: z.number().int().positive(),
  landedCostPerCigar: z.number().positive(),
  brokerCommissionPct: z.number().min(0).max(1),
  numRetailAccounts: z.number().int().nonnegative(),
  boxesPerOpeningOrder: z.number().int().nonnegative(),
  reorderCycleWeeks: z.number().int().positive(),
  avgBoxesPerReorder: z.number().int().nonnegative(),
  packagingImportBudget: z.number().nonnegative().default(0),
  eventSalesPerMonth: z.number().nonnegative().default(0),
  websiteOrdersPerMonth: z.number().int().nonnegative().default(0),
  websiteAvgOrderValue: z.number().nonnegative().default(0),
  subscriptionMembers: z.number().int().nonnegative().default(0),
  subscriptionMonthlyPrice: z.number().nonnegative().default(0),
});

export type ScenarioInput = z.infer<typeof ScenarioSchema>;

export type ScenarioResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createScenario(
  input: unknown,
): Promise<ScenarioResult> {
  const user = await requireUser();
  const parsed = ScenarioSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      ok: false,
      error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid input",
    };
  }

  const s = await prisma.forecastScenario.create({
    data: {
      ...parsed.data,
      description: parsed.data.description ?? null,
      createdById: user.id,
    },
  });
  await audit("forecast.scenario_created", {
    actorId: user.id,
    entityType: "ForecastScenario",
    entityId: s.id,
  });
  revalidatePath("/forecasting");
  return { ok: true, id: s.id };
}

export async function updateScenario(
  id: string,
  input: unknown,
): Promise<ScenarioResult> {
  const user = await requireUser();
  const parsed = ScenarioSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await prisma.forecastScenario.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description ?? undefined,
    },
  });
  await audit("forecast.scenario_updated", {
    actorId: user.id,
    entityType: "ForecastScenario",
    entityId: id,
  });
  revalidatePath("/forecasting");
  return { ok: true, id };
}

export async function deleteScenario(id: string): Promise<ScenarioResult> {
  const user = await requireUser();
  const scenario = await prisma.forecastScenario.findUnique({ where: { id } });
  if (!scenario) return { ok: false, error: "Scenario not found." };
  if (scenario.isDefault) {
    return { ok: false, error: "Can't delete a default scenario." };
  }
  await prisma.forecastScenario.delete({ where: { id } });
  await audit("forecast.scenario_deleted", {
    actorId: user.id,
    entityType: "ForecastScenario",
    entityId: id,
  });
  revalidatePath("/forecasting");
  return { ok: true, id };
}
