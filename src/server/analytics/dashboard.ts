import type { ImportedSnapshot } from "./imports";

/**
 * Cross-platform unified view. Takes every latest import and computes a
 * single coherent dashboard view — not 6 separate panels.
 */
export type UnifiedDashboard = {
  hasData: boolean;
  // Hero KPIs
  audienceReach: number;
  engagement: number;
  searchImpressions: number;
  searchClicks: number;
  searchCtr: number;
  totalPosts: number;

  // Cross-platform comparison
  channels: ChannelSummary[];

  // Combined top performers (top items from every source, normalized)
  topPerformers: TopPerformer[];

  // Trend overlay (last 30 days, daily) — filled from Meta Content imports
  // (per-post publish dates) or Meta Overview imports (account-level daily).
  reachTrend: ReachTrendPoint[];
  reachTrendSource: "overview" | "content" | "mixed" | "none";

  // Per-source freshness
  freshness: FreshnessEntry[];

  // The strongest single insight we can derive without AI
  highlight: string | null;
};

export type ChannelSummary = {
  source: string;
  label: string;
  reach: number;
  engagement: number;
  posts: number;
  primaryMetric: { label: string; value: number };
  hasData: boolean;
};

export type TopPerformer = {
  source: string;
  type: "post" | "page" | "query" | "video" | "source";
  label: string;
  url: string | null;
  primaryMetric: number;
  primaryMetricLabel: string;
  secondaryMetric: number | null;
  secondaryMetricLabel: string | null;
};

export type ReachTrendPoint = {
  date: string;
  instagram?: number;
  facebook?: number;
  ga4?: number;
};

export type FreshnessEntry = {
  source: string;
  label: string;
  lastImportedAt: string | null;
  periodEnd: string | null;
  staleDays: number | null;
};

const SOURCE_LABELS: Record<string, string> = {
  GA4: "Google Analytics",
  GSC: "Search Console",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
};

const TRACKED_SOURCES = ["GA4", "GSC", "INSTAGRAM", "FACEBOOK", "YOUTUBE"];

export function buildDashboard(imports: ImportedSnapshot[]): UnifiedDashboard {
  if (imports.length === 0) {
    return emptyDashboard();
  }

  // Index latest-per-(source,reportType) — should already be deduped but defensive
  const latest = new Map<string, ImportedSnapshot>();
  for (const imp of imports) {
    const key = `${imp.source}::${imp.reportType}`;
    if (!latest.has(key)) latest.set(key, imp);
  }
  const all = Array.from(latest.values());

  const ga4Traffic = all.find((i) => i.reportType === "ga4_traffic_acquisition");
  const ga4Pages = all.find((i) => i.reportType === "ga4_pages_and_screens");
  const gscQueries = all.find((i) => i.reportType === "gsc_queries");
  const gscPages = all.find((i) => i.reportType === "gsc_pages");
  const igContent = all.find((i) => i.reportType === "instagram_content");
  const igOverview = all.find((i) => i.reportType === "instagram_overview");
  const fbContent = all.find((i) => i.reportType === "facebook_content");
  const fbOverview = all.find((i) => i.reportType === "facebook_overview");
  const ytContent = all.find((i) => i.reportType === "youtube_content");

  // -----------------------
  // Hero KPIs
  // -----------------------
  const ga4Users = num(ga4Traffic?.totals.users);
  const igReach = num(igContent?.totals.reach) || num(igOverview?.totals.reach);
  const fbReach = num(fbContent?.totals.reach) || num(fbOverview?.totals.reach);

  const audienceReach = ga4Users + igReach + fbReach;

  const igEngagement =
    num(igContent?.totals.reactions) +
    num(igContent?.totals.comments) +
    num(igContent?.totals.shares) +
    num(igContent?.totals.saves);
  const fbEngagement =
    num(fbContent?.totals.reactions) +
    num(fbContent?.totals.comments) +
    num(fbContent?.totals.shares) +
    num(fbContent?.totals.saves);
  const ytEngagement = num(ytContent?.totals.views);

  const engagement = igEngagement + fbEngagement;

  const searchImpressions = num(gscQueries?.totals.impressions);
  const searchClicks = num(gscQueries?.totals.clicks);
  const searchCtr =
    searchImpressions > 0 ? searchClicks / searchImpressions : 0;

  const totalPosts =
    num(igContent?.rowCount ?? 0) + num(fbContent?.rowCount ?? 0);

  // -----------------------
  // Channel comparison
  // -----------------------
  const channels: ChannelSummary[] = TRACKED_SOURCES.map((src) => {
    if (src === "INSTAGRAM") {
      return {
        source: src,
        label: SOURCE_LABELS[src],
        reach: igReach,
        engagement: igEngagement,
        posts: num(igContent?.rowCount ?? 0),
        primaryMetric: { label: "reach", value: igReach },
        hasData: Boolean(igContent || igOverview),
      };
    }
    if (src === "FACEBOOK") {
      return {
        source: src,
        label: SOURCE_LABELS[src],
        reach: fbReach,
        engagement: fbEngagement,
        posts: num(fbContent?.rowCount ?? 0),
        primaryMetric: { label: "reach", value: fbReach },
        hasData: Boolean(fbContent || fbOverview),
      };
    }
    if (src === "GA4") {
      return {
        source: src,
        label: SOURCE_LABELS[src],
        reach: ga4Users,
        engagement: 0,
        posts: 0,
        primaryMetric: { label: "users", value: ga4Users },
        hasData: Boolean(ga4Traffic || ga4Pages),
      };
    }
    if (src === "GSC") {
      return {
        source: src,
        label: SOURCE_LABELS[src],
        reach: searchImpressions,
        engagement: searchClicks,
        posts: 0,
        primaryMetric: { label: "impressions", value: searchImpressions },
        hasData: Boolean(gscQueries || gscPages),
      };
    }
    // YouTube
    return {
      source: src,
      label: SOURCE_LABELS[src],
      reach: num(ytContent?.totals.views),
      engagement: ytEngagement,
      posts: num(ytContent?.rowCount ?? 0),
      primaryMetric: { label: "views", value: num(ytContent?.totals.views) },
      hasData: Boolean(ytContent),
    };
  });

  // -----------------------
  // Top performers (cross-platform, normalized)
  // -----------------------
  const topPerformers: TopPerformer[] = [];

  for (const post of (igContent?.topEntities ?? []).slice(0, 5)) {
    topPerformers.push({
      source: "INSTAGRAM",
      type: "post",
      label: String(post.caption || post.postId || "Untitled post"),
      url: post.permalink ? String(post.permalink) : null,
      primaryMetric: num(post.totalEngagement),
      primaryMetricLabel: "engagement",
      secondaryMetric: num(post.reach),
      secondaryMetricLabel: "reach",
    });
  }
  for (const post of (fbContent?.topEntities ?? []).slice(0, 5)) {
    topPerformers.push({
      source: "FACEBOOK",
      type: "post",
      label: String(post.caption || post.postId || "Untitled post"),
      url: post.permalink ? String(post.permalink) : null,
      primaryMetric: num(post.totalEngagement),
      primaryMetricLabel: "engagement",
      secondaryMetric: num(post.reach),
      secondaryMetricLabel: "reach",
    });
  }
  for (const query of (gscQueries?.topEntities ?? []).slice(0, 5)) {
    topPerformers.push({
      source: "GSC",
      type: "query",
      label: String(query.query),
      url: null,
      primaryMetric: num(query.clicks),
      primaryMetricLabel: "clicks",
      secondaryMetric: num(query.impressions),
      secondaryMetricLabel: "impressions",
    });
  }
  for (const page of (gscPages?.topEntities ?? []).slice(0, 3)) {
    topPerformers.push({
      source: "GSC",
      type: "page",
      label: String(page.page),
      url: String(page.page),
      primaryMetric: num(page.clicks),
      primaryMetricLabel: "clicks",
      secondaryMetric: num(page.impressions),
      secondaryMetricLabel: "impressions",
    });
  }
  for (const page of (ga4Pages?.topEntities ?? []).slice(0, 3)) {
    topPerformers.push({
      source: "GA4",
      type: "page",
      label: String(page.title || page.path),
      url: page.path ? String(page.path) : null,
      primaryMetric: num(page.views),
      primaryMetricLabel: "views",
      secondaryMetric: num(page.users),
      secondaryMetricLabel: "users",
    });
  }
  for (const video of (ytContent?.topEntities ?? []).slice(0, 3)) {
    topPerformers.push({
      source: "YOUTUBE",
      type: "video",
      label: String(video.title),
      url: null,
      primaryMetric: num(video.views),
      primaryMetricLabel: "views",
      secondaryMetric: num(video.watchTime),
      secondaryMetricLabel: "watch hours",
    });
  }

  // Sort by primaryMetric desc, take top 15 — but each source must be represented
  // if it has data, so we interleave a bit
  topPerformers.sort((a, b) => b.primaryMetric - a.primaryMetric);
  const performers = topPerformers.slice(0, 15);

  // -----------------------
  // Reach trend overlay
  // Prefer Overview imports (daily account-level reach), fall back to
  // Content imports which produce a daily timeseries from post publish dates.
  // -----------------------
  const trendMap = new Map<string, ReachTrendPoint>();
  const igTrendSource = igOverview ?? igContent;
  const fbTrendSource = fbOverview ?? fbContent;
  const igKind = igOverview ? "overview" : igContent ? "content" : null;
  const fbKind = fbOverview ? "overview" : fbContent ? "content" : null;

  if (igTrendSource?.timeseries) {
    for (const r of igTrendSource.timeseries) {
      const d = String(r.date);
      if (!d || d === "undefined") continue;
      const existing = trendMap.get(d) ?? { date: d };
      existing.instagram = num(r.reach);
      trendMap.set(d, existing);
    }
  }
  if (fbTrendSource?.timeseries) {
    for (const r of fbTrendSource.timeseries) {
      const d = String(r.date);
      if (!d || d === "undefined") continue;
      const existing = trendMap.get(d) ?? { date: d };
      existing.facebook = num(r.reach);
      trendMap.set(d, existing);
    }
  }
  const reachTrend = Array.from(trendMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const reachTrendSource: UnifiedDashboard["reachTrendSource"] =
    !igKind && !fbKind
      ? "none"
      : igKind && fbKind && igKind !== fbKind
        ? "mixed"
        : (igKind ?? fbKind ?? "none");

  // -----------------------
  // Freshness
  // -----------------------
  const now = Date.now();
  const freshness: FreshnessEntry[] = TRACKED_SOURCES.map((src) => {
    const latestForSource = all
      .filter((i) => i.source === src)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!latestForSource) {
      return {
        source: src,
        label: SOURCE_LABELS[src],
        lastImportedAt: null,
        periodEnd: null,
        staleDays: null,
      };
    }
    const importedAt = new Date(latestForSource.createdAt).getTime();
    const staleDays = Math.round((now - importedAt) / 86400000);
    return {
      source: src,
      label: SOURCE_LABELS[src],
      lastImportedAt: latestForSource.createdAt,
      periodEnd: latestForSource.periodEnd,
      staleDays,
    };
  });

  // -----------------------
  // Highlight — pick the single most striking signal
  // -----------------------
  const highlight = pickHighlight({
    audienceReach,
    engagement,
    searchImpressions,
    searchClicks,
    topPerformer: performers[0],
    channels,
  });

  return {
    hasData: true,
    audienceReach,
    engagement,
    searchImpressions,
    searchClicks,
    searchCtr,
    totalPosts,
    channels,
    topPerformers: performers,
    reachTrend,
    reachTrendSource,
    freshness,
    highlight,
  };
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function pickHighlight(d: {
  audienceReach: number;
  engagement: number;
  searchImpressions: number;
  searchClicks: number;
  topPerformer: TopPerformer | undefined;
  channels: ChannelSummary[];
}): string | null {
  if (!d.topPerformer) return null;
  const reachLines: string[] = [];
  if (d.audienceReach > 0) {
    reachLines.push(`reached ${compact(d.audienceReach)} people across channels`);
  }
  if (d.searchClicks > 0) {
    reachLines.push(
      `${compact(d.searchClicks)} clicks from search (${(
        (d.searchClicks / Math.max(d.searchImpressions, 1)) *
        100
      ).toFixed(1)}% CTR)`,
    );
  }
  const top = d.topPerformer;
  const topLine = `Top performer: "${top.label.slice(0, 60)}${top.label.length > 60 ? "…" : ""}" — ${compact(top.primaryMetric)} ${top.primaryMetricLabel} on ${SOURCE_LABELS[top.source] ?? top.source}.`;
  return [...reachLines, topLine].join(" · ");
}

function compact(n: number): string {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function emptyDashboard(): UnifiedDashboard {
  return {
    hasData: false,
    audienceReach: 0,
    engagement: 0,
    searchImpressions: 0,
    searchClicks: 0,
    searchCtr: 0,
    totalPosts: 0,
    channels: [],
    topPerformers: [],
    reachTrend: [],
    reachTrendSource: "none",
    freshness: [],
    highlight: null,
  };
}
