import "server-only";
import { google } from "googleapis";
import { env } from "@/lib/env";
import { googleAuth, isGoogleConfigured } from "./google-auth";
import { ok, err, type Outcome } from "./types";

export function isGSCConfigured(): boolean {
  return isGoogleConfigured() && Boolean(env.GSC_SITE_URL);
}

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

async function gscClient() {
  const auth = googleAuth(SCOPES);
  return google.searchconsole({ version: "v1", auth });
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export type GSCSummary = {
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  timeseries: { date: string; clicks: number; impressions: number }[];
  topQueries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[];
  topPages: { page: string; clicks: number; impressions: number; ctr: number; position: number }[];
};

export async function getGSCSummary(rangeDays: number): Promise<Outcome<GSCSummary>> {
  if (!isGSCConfigured()) {
    return err("gsc.unconfigured", "GSC is not configured");
  }
  try {
    const client = await gscClient();
    const siteUrl = env.GSC_SITE_URL!;
    const startDate = isoDaysAgo(rangeDays);
    const endDate = isoDaysAgo(1); // GSC data lags ~24-48h; today returns nothing

    const base = { siteUrl, requestBody: { startDate, endDate, rowLimit: 500 } };

    const [tsRes, queriesRes, pagesRes] = await Promise.all([
      client.searchanalytics.query({
        ...base,
        requestBody: { ...base.requestBody, dimensions: ["date"] },
      }),
      client.searchanalytics.query({
        ...base,
        requestBody: { ...base.requestBody, dimensions: ["query"], rowLimit: 10 },
      }),
      client.searchanalytics.query({
        ...base,
        requestBody: { ...base.requestBody, dimensions: ["page"], rowLimit: 10 },
      }),
    ]);

    const tsRows = tsRes.data.rows ?? [];
    const totals = tsRows.reduce<{ clicks: number; impressions: number }>(
      (acc, r) => {
        acc.clicks += r.clicks ?? 0;
        acc.impressions += r.impressions ?? 0;
        return acc;
      },
      { clicks: 0, impressions: 0 },
    );
    const avgPos =
      tsRows.length > 0
        ? tsRows.reduce((a, r) => a + (r.position ?? 0), 0) / tsRows.length
        : 0;
    const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    return ok({
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        ctr,
        position: avgPos,
      },
      timeseries: tsRows.map((r) => ({
        date: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
      })),
      topQueries: (queriesRes.data.rows ?? []).map((r) => ({
        query: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      })),
      topPages: (pagesRes.data.rows ?? []).map((r) => ({
        page: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      })),
    });
  } catch (e) {
    return err(
      "gsc.api",
      e instanceof Error ? e.message : "GSC request failed",
      true,
      e,
    );
  }
}
