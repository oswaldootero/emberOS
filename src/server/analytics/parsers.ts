import Papa from "papaparse";

/**
 * Common shape every parser produces.
 */
export type ParsedImport = {
  source:
    | "GA4"
    | "GSC"
    | "INSTAGRAM"
    | "FACEBOOK"
    | "YOUTUBE"
    | "TIKTOK"
    | "EMAIL"
    | "CUSTOM";
  reportType: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  rowCount: number;
  totals: Record<string, number>;
  timeseries: Array<{ date: string; [metric: string]: number | string }>;
  topEntities: Array<Record<string, string | number>>;
  warnings: string[];
};

export const REPORT_TYPES = {
  GA4: [
    { value: "ga4_traffic_acquisition", label: "Traffic acquisition (source / medium)" },
    { value: "ga4_pages_and_screens", label: "Pages and screens" },
    { value: "ga4_demographics", label: "Demographics (country)" },
  ],
  GSC: [
    { value: "gsc_queries", label: "Performance — Queries" },
    { value: "gsc_pages", label: "Performance — Pages" },
  ],
  INSTAGRAM: [
    { value: "instagram_content", label: "Content insights (posts / reels)" },
    { value: "instagram_overview", label: "Account overview" },
  ],
  FACEBOOK: [
    { value: "facebook_content", label: "Content insights (posts)" },
    { value: "facebook_overview", label: "Page overview" },
  ],
} as const;

const PARSERS: Record<string, (raw: string, filename: string) => ParsedImport> = {
  ga4_traffic_acquisition: parseGA4TrafficAcquisition,
  ga4_pages_and_screens: parseGA4PagesAndScreens,
  ga4_demographics: parseGA4Demographics,
  gsc_queries: parseGSCQueries,
  gsc_pages: parseGSCPages,
  instagram_content: parseMetaContent("INSTAGRAM"),
  instagram_overview: parseMetaOverview("INSTAGRAM"),
  facebook_content: parseMetaContent("FACEBOOK"),
  facebook_overview: parseMetaOverview("FACEBOOK"),
};

export function parseImport(
  reportType: string,
  raw: string,
  filename: string,
): ParsedImport {
  const fn = PARSERS[reportType];
  if (!fn) throw new Error(`No parser for report type: ${reportType}`);
  return fn(raw, filename);
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Find the header row in CSVs that have metadata at the top.
 * GA4 exports start with `#` comment lines and a `Start date:` / `End date:` block.
 * Meta exports often have blank lines or descriptive headers.
 */
function findHeaderRowIndex(rows: string[][], candidateColumns: string[]): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map((c) => c.toLowerCase().trim());
    const hits = candidateColumns.filter((c) =>
      row.some((cell) => cell.includes(c.toLowerCase())),
    ).length;
    if (hits >= 2) return i;
  }
  return -1;
}

function parseCSV(raw: string): string[][] {
  const result = Papa.parse<string[]>(raw, {
    skipEmptyLines: true,
  });
  return result.data;
}

function toNumber(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[%,$"]/g, "").trim();
  if (cleaned === "" || cleaned === "—" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeDate(s: string): string {
  // Accept yyyymmdd, yyyy-mm-dd, MM/DD/YYYY
  const cleaned = s.trim();
  if (/^\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleaned)) {
    const [m, d, y] = cleaned.split(/[/\s]/);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try Date constructor as last resort
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return cleaned;
}

function extractGA4Period(raw: string): { periodStart: Date | null; periodEnd: Date | null } {
  // GA4 exports include "# Start date: 20260507" and "# End date: 20260513"
  const start = raw.match(/Start\s*date:?\s*([\d-/]+)/i)?.[1];
  const end = raw.match(/End\s*date:?\s*([\d-/]+)/i)?.[1];
  return {
    periodStart: start ? new Date(normalizeDate(start)) : null,
    periodEnd: end ? new Date(normalizeDate(end)) : null,
  };
}

function dateRangeFromTimeseries(
  series: { date: string }[],
): { periodStart: Date | null; periodEnd: Date | null } {
  const valid = series
    .map((r) => new Date(r.date))
    .filter((d) => !isNaN(d.getTime()));
  if (valid.length === 0) return { periodStart: null, periodEnd: null };
  return {
    periodStart: new Date(Math.min(...valid.map((d) => d.getTime()))),
    periodEnd: new Date(Math.max(...valid.map((d) => d.getTime()))),
  };
}

// ----------------------------------------------------------------
// GA4 parsers
// ----------------------------------------------------------------

function parseGA4TrafficAcquisition(raw: string): ParsedImport {
  const rows = parseCSV(raw);
  const headerIdx = findHeaderRowIndex(rows, [
    "session source",
    "source / medium",
    "users",
    "sessions",
  ]);
  if (headerIdx === -1) throw new Error("Couldn't find header row in GA4 traffic CSV");

  const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 2);

  const cols = {
    source: findColIndex(headers, ["session source / medium", "source / medium", "session source", "first user source", "session medium"]),
    users: findColIndex(headers, ["active users", "users"]),
    newUsers: findColIndex(headers, ["new users"]),
    sessions: findColIndex(headers, ["sessions"]),
    engagedSessions: findColIndex(headers, ["engaged sessions"]),
    engagementRate: findColIndex(headers, ["engagement rate"]),
    avgSessionDuration: findColIndex(headers, ["average session duration", "avg engagement time per session"]),
    eventCount: findColIndex(headers, ["event count"]),
    conversions: findColIndex(headers, ["conversions"]),
  };

  const topEntities = dataRows.slice(0, 20).map((r) => ({
    source: r[cols.source] ?? "(unknown)",
    users: toNumber(r[cols.users]),
    newUsers: toNumber(r[cols.newUsers]),
    sessions: toNumber(r[cols.sessions]),
    engagedSessions: toNumber(r[cols.engagedSessions]),
    engagementRate: toNumber(r[cols.engagementRate]),
    conversions: toNumber(r[cols.conversions]),
  }));

  const totals = topEntities.reduce(
    (acc, row) => ({
      users: acc.users + Number(row.users),
      sessions: acc.sessions + Number(row.sessions),
      engagedSessions: acc.engagedSessions + Number(row.engagedSessions),
      newUsers: acc.newUsers + Number(row.newUsers),
      conversions: acc.conversions + Number(row.conversions),
    }),
    { users: 0, sessions: 0, engagedSessions: 0, newUsers: 0, conversions: 0 },
  );

  const period = extractGA4Period(raw);
  return {
    source: "GA4",
    reportType: "ga4_traffic_acquisition",
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    rowCount: dataRows.length,
    totals,
    timeseries: [],
    topEntities,
    warnings: cols.source === -1 ? ["Source/medium column not detected"] : [],
  };
}

function parseGA4PagesAndScreens(raw: string): ParsedImport {
  const rows = parseCSV(raw);
  const headerIdx = findHeaderRowIndex(rows, ["page path", "page title", "screen", "views"]);
  if (headerIdx === -1) throw new Error("Couldn't find header row in GA4 pages CSV");

  const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 2);

  const cols = {
    path: findColIndex(headers, ["page path and screen class", "page path", "page", "screen"]),
    title: findColIndex(headers, ["page title and screen name", "page title"]),
    views: findColIndex(headers, ["views", "screen page views", "page views"]),
    users: findColIndex(headers, ["active users", "users"]),
    avgTime: findColIndex(headers, ["average engagement time per active user", "avg engagement time"]),
  };

  const topEntities = dataRows.slice(0, 20).map((r) => ({
    path: r[cols.path] ?? "",
    title: r[cols.title] ?? "",
    views: toNumber(r[cols.views]),
    users: toNumber(r[cols.users]),
    avgEngagementTime: toNumber(r[cols.avgTime]),
  }));

  const totals = topEntities.reduce(
    (acc, r) => ({
      views: acc.views + Number(r.views),
      users: acc.users + Number(r.users),
    }),
    { views: 0, users: 0 },
  );

  const period = extractGA4Period(raw);
  return {
    source: "GA4",
    reportType: "ga4_pages_and_screens",
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    rowCount: dataRows.length,
    totals,
    timeseries: [],
    topEntities,
    warnings: cols.path === -1 ? ["Path column not detected"] : [],
  };
}

function parseGA4Demographics(raw: string): ParsedImport {
  const rows = parseCSV(raw);
  const headerIdx = findHeaderRowIndex(rows, ["country", "users"]);
  if (headerIdx === -1) throw new Error("Couldn't find header row in GA4 demographics CSV");

  const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 2);

  const cols = {
    country: findColIndex(headers, ["country"]),
    users: findColIndex(headers, ["active users", "users"]),
    newUsers: findColIndex(headers, ["new users"]),
    engagementRate: findColIndex(headers, ["engagement rate"]),
  };

  const topEntities = dataRows.slice(0, 30).map((r) => ({
    country: r[cols.country] ?? "Unknown",
    users: toNumber(r[cols.users]),
    newUsers: toNumber(r[cols.newUsers]),
    engagementRate: toNumber(r[cols.engagementRate]),
  }));

  const totals = topEntities.reduce(
    (acc, r) => ({ users: acc.users + Number(r.users) }),
    { users: 0 },
  );

  const period = extractGA4Period(raw);
  return {
    source: "GA4",
    reportType: "ga4_demographics",
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    rowCount: dataRows.length,
    totals,
    timeseries: [],
    topEntities,
    warnings: [],
  };
}

// ----------------------------------------------------------------
// GSC parsers
// ----------------------------------------------------------------

function parseGSCQueries(raw: string): ParsedImport {
  const rows = parseCSV(raw);
  const headerIdx = findHeaderRowIndex(rows, ["query", "top queries", "clicks", "impressions"]);
  if (headerIdx === -1) throw new Error("Couldn't find header row in GSC queries CSV");

  const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 2);

  const cols = {
    query: findColIndex(headers, ["top queries", "query"]),
    clicks: findColIndex(headers, ["clicks"]),
    impressions: findColIndex(headers, ["impressions"]),
    ctr: findColIndex(headers, ["ctr"]),
    position: findColIndex(headers, ["position"]),
  };

  const topEntities = dataRows.slice(0, 50).map((r) => ({
    query: r[cols.query] ?? "",
    clicks: toNumber(r[cols.clicks]),
    impressions: toNumber(r[cols.impressions]),
    ctr: toNumber(r[cols.ctr]),
    position: toNumber(r[cols.position]),
  }));

  const totals = topEntities.reduce(
    (acc, r) => ({
      clicks: acc.clicks + Number(r.clicks),
      impressions: acc.impressions + Number(r.impressions),
    }),
    { clicks: 0, impressions: 0 },
  );
  const overallCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

  return {
    source: "GSC",
    reportType: "gsc_queries",
    periodStart: null,
    periodEnd: null,
    rowCount: dataRows.length,
    totals: { ...totals, avgCtr: overallCtr },
    timeseries: [],
    topEntities,
    warnings: [],
  };
}

function parseGSCPages(raw: string): ParsedImport {
  const rows = parseCSV(raw);
  const headerIdx = findHeaderRowIndex(rows, ["page", "top pages", "clicks", "impressions"]);
  if (headerIdx === -1) throw new Error("Couldn't find header row in GSC pages CSV");

  const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 2);

  const cols = {
    page: findColIndex(headers, ["top pages", "page"]),
    clicks: findColIndex(headers, ["clicks"]),
    impressions: findColIndex(headers, ["impressions"]),
    ctr: findColIndex(headers, ["ctr"]),
    position: findColIndex(headers, ["position"]),
  };

  const topEntities = dataRows.slice(0, 50).map((r) => ({
    page: r[cols.page] ?? "",
    clicks: toNumber(r[cols.clicks]),
    impressions: toNumber(r[cols.impressions]),
    ctr: toNumber(r[cols.ctr]),
    position: toNumber(r[cols.position]),
  }));

  const totals = topEntities.reduce(
    (acc, r) => ({
      clicks: acc.clicks + Number(r.clicks),
      impressions: acc.impressions + Number(r.impressions),
    }),
    { clicks: 0, impressions: 0 },
  );

  return {
    source: "GSC",
    reportType: "gsc_pages",
    periodStart: null,
    periodEnd: null,
    rowCount: dataRows.length,
    totals,
    timeseries: [],
    topEntities,
    warnings: [],
  };
}

// ----------------------------------------------------------------
// Meta (Instagram + Facebook) parsers
// ----------------------------------------------------------------

function parseMetaContent(source: "INSTAGRAM" | "FACEBOOK") {
  return function (raw: string): ParsedImport {
    const rows = parseCSV(raw);
    const headerIdx = findHeaderRowIndex(rows, [
      "post id",
      "publish time",
      "reach",
      "impressions",
      "permalink",
    ]);
    if (headerIdx === -1) {
      throw new Error(
        "Couldn't find header row in Meta export — confirm the file is a Content insights CSV.",
      );
    }

    const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 3);

    const cols = {
      postId: findColIndex(headers, ["post id"]),
      type: findColIndex(headers, ["post type", "content type", "media type"]),
      caption: findColIndex(headers, ["title", "caption", "description"]),
      publishedAt: findColIndex(headers, ["publish time", "date", "post created"]),
      permalink: findColIndex(headers, ["permalink", "post link"]),
      reach: findColIndex(headers, ["reach"]),
      impressions: findColIndex(headers, ["impressions", "views"]),
      reactions: findColIndex(headers, ["reactions", "likes"]),
      comments: findColIndex(headers, ["comments"]),
      shares: findColIndex(headers, ["shares"]),
      saves: findColIndex(headers, ["saves", "saved"]),
    };

    const topEntities = dataRows.map((r) => {
      const reach = toNumber(r[cols.reach]);
      const impressions = toNumber(r[cols.impressions]);
      const reactions = toNumber(r[cols.reactions]);
      const comments = toNumber(r[cols.comments]);
      const shares = toNumber(r[cols.shares]);
      const saves = toNumber(r[cols.saves]);
      const totalEngagement = reactions + comments + shares + saves;
      const engagementRate =
        reach > 0 ? totalEngagement / reach : impressions > 0 ? totalEngagement / impressions : 0;

      return {
        postId: r[cols.postId] ?? "",
        type: r[cols.type] ?? "",
        caption: (r[cols.caption] ?? "").slice(0, 200),
        publishedAt: r[cols.publishedAt] ?? "",
        permalink: r[cols.permalink] ?? "",
        reach,
        impressions,
        reactions,
        comments,
        shares,
        saves,
        totalEngagement,
        engagementRate,
      };
    });

    // Sort by total engagement descending
    topEntities.sort((a, b) => Number(b.totalEngagement) - Number(a.totalEngagement));

    const totals = topEntities.reduce(
      (acc, r) => ({
        reach: acc.reach + Number(r.reach),
        impressions: acc.impressions + Number(r.impressions),
        reactions: acc.reactions + Number(r.reactions),
        comments: acc.comments + Number(r.comments),
        shares: acc.shares + Number(r.shares),
        saves: acc.saves + Number(r.saves),
      }),
      { reach: 0, impressions: 0, reactions: 0, comments: 0, shares: 0, saves: 0 },
    );

    // Time series from publish dates → engagements per day
    const dayMap = new Map<
      string,
      { date: string; posts: number; reach: number; engagement: number }
    >();
    for (const e of topEntities) {
      const d = normalizeDate(String(e.publishedAt));
      const existing = dayMap.get(d) ?? { date: d, posts: 0, reach: 0, engagement: 0 };
      existing.posts += 1;
      existing.reach += Number(e.reach);
      existing.engagement += Number(e.totalEngagement);
      dayMap.set(d, existing);
    }
    const timeseries = Array.from(dayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const period = dateRangeFromTimeseries(timeseries);

    return {
      source,
      reportType: source === "INSTAGRAM" ? "instagram_content" : "facebook_content",
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      rowCount: dataRows.length,
      totals,
      timeseries,
      topEntities: topEntities.slice(0, 30),
      warnings: cols.permalink === -1 ? ["Permalink column not detected — links to posts may be missing"] : [],
    };
  };
}

function parseMetaOverview(source: "INSTAGRAM" | "FACEBOOK") {
  return function (raw: string): ParsedImport {
    const rows = parseCSV(raw);
    const headerIdx = findHeaderRowIndex(rows, ["date", "reach", "impressions", "followers"]);
    if (headerIdx === -1) throw new Error("Couldn't find header row in Meta overview CSV");

    const headers = rows[headerIdx].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(headerIdx + 1).filter((r) => r.length >= 2);

    const cols = {
      date: findColIndex(headers, ["date"]),
      reach: findColIndex(headers, ["reach", "accounts reached"]),
      impressions: findColIndex(headers, ["impressions", "views"]),
      followers: findColIndex(headers, ["followers", "page likes", "page followers"]),
      profileViews: findColIndex(headers, ["profile visits", "profile views"]),
      websiteClicks: findColIndex(headers, ["website clicks", "website taps"]),
    };

    const timeseries = dataRows.map((r) => ({
      date: normalizeDate(r[cols.date] ?? ""),
      reach: toNumber(r[cols.reach]),
      impressions: toNumber(r[cols.impressions]),
      followers: toNumber(r[cols.followers]),
      profileViews: toNumber(r[cols.profileViews]),
      websiteClicks: toNumber(r[cols.websiteClicks]),
    }));

    const totals = timeseries.reduce(
      (acc, r) => ({
        reach: acc.reach + Number(r.reach),
        impressions: acc.impressions + Number(r.impressions),
        profileViews: acc.profileViews + Number(r.profileViews),
        websiteClicks: acc.websiteClicks + Number(r.websiteClicks),
      }),
      { reach: 0, impressions: 0, profileViews: 0, websiteClicks: 0 },
    );
    const period = dateRangeFromTimeseries(timeseries);

    return {
      source,
      reportType: source === "INSTAGRAM" ? "instagram_overview" : "facebook_overview",
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      rowCount: dataRows.length,
      totals,
      timeseries,
      topEntities: [],
      warnings: [],
    };
  };
}

function findColIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h === c.toLowerCase());
    if (idx !== -1) return idx;
  }
  // Fuzzy match — contains
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.includes(c.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}
