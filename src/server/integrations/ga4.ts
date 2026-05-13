import "server-only";
import { google } from "googleapis";
import { env } from "@/lib/env";
import { googleAuth, isGoogleConfigured } from "./google-auth";
import { ok, err, type Outcome } from "./types";

export function isGA4Configured(): boolean {
  return isGoogleConfigured() && Boolean(env.GA4_PROPERTY_ID);
}

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

async function dataClient() {
  const auth = googleAuth(SCOPES);
  return google.analyticsdata({ version: "v1beta", auth });
}

function propertyName(): string {
  // GA4 property IDs in the Data API are referenced as `properties/{id}`.
  // Users typically paste just the numeric id — handle both shapes.
  const id = env.GA4_PROPERTY_ID ?? "";
  return id.startsWith("properties/") ? id : `properties/${id}`;
}

export type GA4Summary = {
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number; // 0..1
    avgSessionDurationSec: number;
  };
  timeseries: { date: string; users: number; sessions: number; pageViews: number }[];
  topPages: { path: string; title: string | null; views: number }[];
  topSources: { source: string; medium: string; users: number }[];
  topCountries: { country: string; users: number }[];
  devices: { category: string; users: number }[];
};

export async function getGA4Summary(rangeDays: number): Promise<Outcome<GA4Summary>> {
  if (!isGA4Configured()) {
    return err("ga4.unconfigured", "GA4 is not configured");
  }
  try {
    const client = await dataClient();
    const property = propertyName();
    const dateRanges = [{ startDate: `${rangeDays}daysAgo`, endDate: "today" }];

    const [totalsRes, tsRes, pagesRes, sourcesRes, countriesRes, devicesRes] =
      await Promise.all([
        client.properties.runReport({
          property,
          requestBody: {
            dateRanges,
            metrics: [
              { name: "activeUsers" },
              { name: "newUsers" },
              { name: "sessions" },
              { name: "screenPageViews" },
              { name: "engagementRate" },
              { name: "averageSessionDuration" },
            ],
          },
        }),
        client.properties.runReport({
          property,
          requestBody: {
            dateRanges,
            dimensions: [{ name: "date" }],
            metrics: [
              { name: "activeUsers" },
              { name: "sessions" },
              { name: "screenPageViews" },
            ],
            orderBys: [{ dimension: { dimensionName: "date" } }],
          },
        }),
        client.properties.runReport({
          property,
          requestBody: {
            dateRanges,
            dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
            metrics: [{ name: "screenPageViews" }],
            orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            limit: "10",
          },
        }),
        client.properties.runReport({
          property,
          requestBody: {
            dateRanges,
            dimensions: [
              { name: "sessionSource" },
              { name: "sessionMedium" },
            ],
            metrics: [{ name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
            limit: "10",
          },
        }),
        client.properties.runReport({
          property,
          requestBody: {
            dateRanges,
            dimensions: [{ name: "country" }],
            metrics: [{ name: "activeUsers" }],
            orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
            limit: "6",
          },
        }),
        client.properties.runReport({
          property,
          requestBody: {
            dateRanges,
            dimensions: [{ name: "deviceCategory" }],
            metrics: [{ name: "activeUsers" }],
          },
        }),
      ]);

    const totalsRow = totalsRes.data.rows?.[0]?.metricValues ?? [];
    const m = (i: number) => Number(totalsRow[i]?.value ?? 0);

    const timeseries =
      tsRes.data.rows?.map((r) => ({
        date: formatGADate(r.dimensionValues?.[0]?.value ?? ""),
        users: Number(r.metricValues?.[0]?.value ?? 0),
        sessions: Number(r.metricValues?.[1]?.value ?? 0),
        pageViews: Number(r.metricValues?.[2]?.value ?? 0),
      })) ?? [];

    const topPages =
      pagesRes.data.rows?.map((r) => ({
        path: r.dimensionValues?.[0]?.value ?? "",
        title: r.dimensionValues?.[1]?.value ?? null,
        views: Number(r.metricValues?.[0]?.value ?? 0),
      })) ?? [];

    const topSources =
      sourcesRes.data.rows?.map((r) => ({
        source: r.dimensionValues?.[0]?.value ?? "(direct)",
        medium: r.dimensionValues?.[1]?.value ?? "",
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })) ?? [];

    const topCountries =
      countriesRes.data.rows?.map((r) => ({
        country: r.dimensionValues?.[0]?.value ?? "Unknown",
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })) ?? [];

    const devices =
      devicesRes.data.rows?.map((r) => ({
        category: r.dimensionValues?.[0]?.value ?? "unknown",
        users: Number(r.metricValues?.[0]?.value ?? 0),
      })) ?? [];

    return ok({
      totals: {
        activeUsers: m(0),
        newUsers: m(1),
        sessions: m(2),
        pageViews: m(3),
        engagementRate: m(4),
        avgSessionDurationSec: m(5),
      },
      timeseries,
      topPages,
      topSources,
      topCountries,
      devices,
    });
  } catch (e) {
    return err(
      "ga4.api",
      e instanceof Error ? e.message : "GA4 request failed",
      true,
      e,
    );
  }
}

function formatGADate(yyyymmdd: string): string {
  // GA returns dates like "20260512" — convert to "2026-05-12"
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
