"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { parseImport } from "@/server/analytics/parsers";

export type ImportResult =
  | {
      ok: true;
      id: string;
      rowCount: number;
      source: string;
      reportType: string;
      warnings: string[];
    }
  | { ok: false; error: string };

export async function importAnalyticsCSV(formData: FormData): Promise<ImportResult> {
  const user = await requireUser();

  const file = formData.get("file");
  const reportType = formData.get("reportType");
  const label = formData.get("label");

  if (!(file instanceof File)) {
    return { ok: false, error: "No file uploaded." };
  }
  if (typeof reportType !== "string" || reportType === "") {
    return { ok: false, error: "Missing report type." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "File is larger than 10MB." };
  }

  const raw = await file.text();
  if (raw.length < 50) {
    return { ok: false, error: "File looks empty." };
  }

  let parsed;
  try {
    parsed = parseImport(reportType, raw, file.name);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not parse the CSV.",
    };
  }

  const created = await prisma.analyticsImport.create({
    data: {
      source: parsed.source,
      reportType: parsed.reportType,
      label: typeof label === "string" && label ? label : null,
      filename: file.name,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      rowCount: parsed.rowCount,
      totals: parsed.totals,
      timeseries: parsed.timeseries,
      topEntities: parsed.topEntities,
      metadata: { warnings: parsed.warnings },
      uploadedById: user.id,
    },
  });

  await audit("analytics.import", {
    actorId: user.id,
    entityType: "AnalyticsImport",
    entityId: created.id,
    diff: {
      source: parsed.source,
      reportType: parsed.reportType,
      rowCount: parsed.rowCount,
    },
  });

  revalidatePath("/analytics");
  revalidatePath("/analytics/import");

  return {
    ok: true,
    id: created.id,
    rowCount: parsed.rowCount,
    source: parsed.source,
    reportType: parsed.reportType,
    warnings: parsed.warnings,
  };
}

export async function deleteImport(id: string): Promise<ImportResult> {
  const user = await requireUser();
  const existing = await prisma.analyticsImport.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Import not found." };
  // Only admin or original uploader can delete
  if (user.role !== "ADMIN" && existing.uploadedById !== user.id) {
    return { ok: false, error: "Not authorized." };
  }
  await prisma.analyticsImport.delete({ where: { id } });
  await audit("analytics.import.delete", {
    actorId: user.id,
    entityType: "AnalyticsImport",
    entityId: id,
  });
  revalidatePath("/analytics");
  revalidatePath("/analytics/import");
  return {
    ok: true,
    id,
    rowCount: 0,
    source: existing.source,
    reportType: existing.reportType,
    warnings: [],
  };
}
