import { prisma } from "@/lib/prisma";
import {
  isConfigured as wpIsConfigured,
  getStats as wpGetStats,
} from "@/server/integrations/wordpress";
import { getLatestImports } from "@/server/analytics/imports";

export type DashboardChannel = {
  name: string;
  value: string;
  subtitle: string;
  source: "live" | "import" | "demo";
  healthy: boolean;
};

export type DashboardSnapshot = {
  live: boolean;
  stats: {
    scheduledCount: number;
    totalContent: number;
    aiJobsRecent: number;
    telegramMembers: number;
    telegramMsgs: number;
  };
  queue: {
    id: string;
    title: string;
    platform: string;
    scheduledFor: string;
    status: "QUEUED" | "PROCESSING" | "FAILED";
  }[];
  channels: DashboardChannel[];
  engagementSeries: { date: string; engagement: number; reach: number }[];
  engagementSource: "imports" | "demo";
};

/**
 * Server-side data loader for the Mission Control dashboard. Pulls real
 * numbers from the database, WordPress REST, and any uploaded analytics
 * CSV imports. Gracefully degrades to a tasteful empty state — never demo
 * inflation — so what you see is genuinely what's there.
 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  try {
    const [scheduled, totalContent, aiJobsRecent, telegramMembers, telegramMsgs, imports] =
      await Promise.all([
        prisma.scheduledPost.findMany({
          where: { status: { in: ["QUEUED", "PROCESSING"] } },
          orderBy: { scheduledFor: "asc" },
          take: 8,
          include: { content: { select: { title: true } } },
        }),
        prisma.contentPiece.count(),
        prisma.aIJob.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.telegramMember.count(),
        prisma.telegramMessage.count({
          where: { sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        }),
        getLatestImports(),
      ]);

    // ── Channels ─────────────────────────────────────────────
    const ig = imports.find(
      (i) => i.source === "INSTAGRAM" && i.reportType === "instagram_content",
    );
    const fb = imports.find(
      (i) => i.source === "FACEBOOK" && i.reportType === "facebook_content",
    );
    const igOverview = imports.find((i) => i.reportType === "instagram_overview");
    const fbOverview = imports.find((i) => i.reportType === "facebook_overview");

    const channels: DashboardChannel[] = [
      {
        name: "Brotherhood (Telegram)",
        value: telegramMembers > 0 ? telegramMembers.toLocaleString() : "—",
        subtitle:
          telegramMembers > 0
            ? `${telegramMsgs} messages this week`
            : "Connect TELEGRAM_BOT_TOKEN to track",
        source: telegramMembers > 0 ? "live" : "demo",
        healthy: telegramMembers > 0,
      },
      ig
        ? {
            name: "Instagram",
            value: compact(num(ig.totals.reach)),
            subtitle: `${ig.rowCount} posts · ${compact(num(ig.totals.reactions) + num(ig.totals.comments))} engagement`,
            source: "import" as const,
            healthy: true,
          }
        : igOverview
          ? {
              name: "Instagram",
              value: compact(num(igOverview.totals.reach)),
              subtitle: "from Account overview import",
              source: "import" as const,
              healthy: true,
            }
          : {
              name: "Instagram",
              value: "—",
              subtitle: "Upload IG Content insights to populate",
              source: "demo" as const,
              healthy: false,
            },
      fb
        ? {
            name: "Facebook",
            value: compact(num(fb.totals.reach)),
            subtitle: `${fb.rowCount} posts · ${compact(num(fb.totals.reactions) + num(fb.totals.comments))} engagement`,
            source: "import" as const,
            healthy: true,
          }
        : fbOverview
          ? {
              name: "Facebook",
              value: compact(num(fbOverview.totals.reach)),
              subtitle: "from Page overview import",
              source: "import" as const,
              healthy: true,
            }
          : {
              name: "Facebook",
              value: "—",
              subtitle: "Upload FB Content insights to populate",
              source: "demo" as const,
              healthy: false,
            },
      await wordpressChannel(),
    ];

    // ── Engagement series ──────────────────────────────────────
    // Prefer Meta Content timeseries (real). Fall back to a flat
    // demo curve only when there's literally nothing imported.
    const engagementSeries = buildEngagementSeries(ig, fb);
    const engagementSource =
      engagementSeries.length > 0 ? "imports" : "demo";

    const finalSeries =
      engagementSeries.length > 0 ? engagementSeries : demoEngagementSeries();

    return {
      live: true,
      stats: {
        scheduledCount: scheduled.length,
        totalContent,
        aiJobsRecent,
        telegramMembers,
        telegramMsgs,
      },
      queue: scheduled.map((p) => ({
        id: p.id,
        title: p.content?.title ?? "Untitled",
        platform: p.platform,
        scheduledFor: p.scheduledFor.toISOString(),
        status: p.status as "QUEUED" | "PROCESSING" | "FAILED",
      })),
      channels,
      engagementSeries: finalSeries,
      engagementSource,
    };
  } catch {
    return emptySnapshot();
  }
}

async function wordpressChannel(): Promise<DashboardChannel> {
  if (!wpIsConfigured()) {
    return {
      name: "WordPress",
      value: "—",
      subtitle: "Configure WORDPRESS_* env vars",
      source: "demo",
      healthy: false,
    };
  }
  const stats = await wpGetStats();
  if (!stats.ok) {
    return {
      name: "WordPress",
      value: "—",
      subtitle: "Connection error — check credentials",
      source: "demo",
      healthy: false,
    };
  }
  return {
    name: "WordPress",
    value: stats.value.total.toLocaleString(),
    subtitle: `${stats.value.publish} published · ${stats.value.draft} drafts`,
    source: "live",
    healthy: true,
  };
}

function buildEngagementSeries(
  ig?: { timeseries: Array<Record<string, string | number>> },
  fb?: { timeseries: Array<Record<string, string | number>> },
): { date: string; engagement: number; reach: number }[] {
  const dayMap = new Map<string, { date: string; engagement: number; reach: number }>();

  for (const t of [ig?.timeseries ?? [], fb?.timeseries ?? []]) {
    for (const r of t) {
      const d = String(r.date ?? "");
      if (!d || d === "undefined") continue;
      const existing = dayMap.get(d) ?? { date: d, engagement: 0, reach: 0 };
      existing.reach += num(r.reach);
      existing.engagement += num(r.engagement) || num(r.totalEngagement);
      dayMap.set(d, existing);
    }
  }

  return Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      engagement: d.engagement,
      reach: d.reach,
    }));
}

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function compact(n: number): string {
  if (n === 0) return "—";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function emptySnapshot(): DashboardSnapshot {
  return {
    live: false,
    stats: {
      scheduledCount: 0,
      totalContent: 0,
      aiJobsRecent: 0,
      telegramMembers: 0,
      telegramMsgs: 0,
    },
    queue: [],
    channels: [],
    engagementSeries: demoEngagementSeries(),
    engagementSource: "demo",
  };
}

export function demoEngagementSeries() {
  // Flat demo curve only used when literally nothing has been imported.
  // Intentionally low-amplitude so it visually reads as "not real."
  const days = 14;
  const out: { date: string; engagement: number; reach: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      engagement: 0,
      reach: 0,
    });
  }
  return out;
}
