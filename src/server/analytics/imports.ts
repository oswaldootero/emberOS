import { prisma } from "@/lib/prisma";
import type { AnalyticsSource } from "@prisma/client";

export type ImportedSnapshot = {
  id: string;
  source: AnalyticsSource;
  reportType: string;
  label: string | null;
  filename: string;
  periodStart: string | null;
  periodEnd: string | null;
  rowCount: number;
  totals: Record<string, number>;
  timeseries: Array<Record<string, string | number>>;
  topEntities: Array<Record<string, string | number>>;
  warnings: string[];
  createdAt: string;
};

/**
 * Load the most recent import per (source, reportType) pair. Old imports are
 * kept in the DB for historical comparison but only the latest of each kind
 * surfaces on the dashboard.
 */
export async function getLatestImports(): Promise<ImportedSnapshot[]> {
  try {
    const rows = await prisma.analyticsImport.findMany({
      orderBy: { createdAt: "desc" },
      take: 200, // generous upper bound; we'll dedupe in JS
    });
    const seen = new Set<string>();
    const out: ImportedSnapshot[] = [];
    for (const r of rows) {
      const key = `${r.source}::${r.reportType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const meta = r.metadata as { warnings?: string[] } | null;
      out.push({
        id: r.id,
        source: r.source,
        reportType: r.reportType,
        label: r.label,
        filename: r.filename,
        periodStart: r.periodStart?.toISOString() ?? null,
        periodEnd: r.periodEnd?.toISOString() ?? null,
        rowCount: r.rowCount,
        totals: r.totals as Record<string, number>,
        timeseries: r.timeseries as Array<Record<string, string | number>>,
        topEntities: r.topEntities as Array<Record<string, string | number>>,
        warnings: meta?.warnings ?? [],
        createdAt: r.createdAt.toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function groupBySource(
  snapshots: ImportedSnapshot[],
): Record<string, ImportedSnapshot[]> {
  const out: Record<string, ImportedSnapshot[]> = {};
  for (const s of snapshots) {
    out[s.source] = out[s.source] ?? [];
    out[s.source].push(s);
  }
  return out;
}
