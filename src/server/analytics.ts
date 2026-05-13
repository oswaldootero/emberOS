import { prisma } from "@/lib/prisma";
import {
  isConfigured as wpIsConfigured,
  getStats as wpGetStats,
  listPosts as wpListPosts,
} from "@/server/integrations/wordpress";
import { getGA4Summary, isGA4Configured, type GA4Summary } from "@/server/integrations/ga4";
import { getGSCSummary, isGSCConfigured, type GSCSummary } from "@/server/integrations/gsc";

export type AnalyticsRange = 7 | 30 | 90;

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  generatedAt: string;
  kpis: {
    contentCreated: { value: number; deltaPct: number | null };
    aiGenerations: { value: number; deltaPct: number | null };
    scheduledPosts: { value: number; deltaPct: number | null };
    aiSpendUsd: { value: number; deltaPct: number | null };
  };
  aiUsage: {
    timeseries: { date: string; jobs: number; tokens: number; costUsd: number }[];
    byContentType: { type: string; count: number }[];
    topUsers: { name: string; jobs: number; costUsd: number }[];
    totalTokens: number;
    totalCostUsd: number;
  };
  content: {
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    recent: { id: string; title: string; type: string; status: string; createdAt: string }[];
  };
  scheduling: {
    byPlatform: { platform: string; queued: number; published: number; failed: number }[];
    successRate: number;
    totalScheduled: number;
    upcoming: { id: string; title: string; platform: string; scheduledFor: string }[];
  };
  wordpress: {
    connected: boolean;
    stats?: { total: number; publish: number; draft: number; future: number; pending: number };
    recent?: { id: number; title: string; status: string; date: string; link: string }[];
  };
  ga4:
    | { connected: false; reason?: string }
    | ({ connected: true } & GA4Summary);
  gsc:
    | { connected: false; reason?: string }
    | ({ connected: true } & GSCSummary);
  telegram: {
    members: number;
    activeMembers7d: number;
    messages: number;
    timeseries: { date: string; messages: number; newMembers: number }[];
    topContributors: { name: string; score: number }[];
  };
};

function bucketize(
  rows: { day: Date }[],
  days: number,
): Map<string, number> {
  const map = new Map<string, number>();
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.day.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null; // can't compute % from zero baseline
  return ((curr - prev) / prev) * 100;
}

export async function getInternalAnalytics(
  range: AnalyticsRange = 30,
): Promise<AnalyticsSnapshot> {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - range);
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - range);

  // Parallel load every internal slice
  const [
    contentCurr,
    contentPrev,
    aiJobsCurr,
    aiJobsPrev,
    scheduledCurr,
    scheduledPrev,
    spendCurr,
    spendPrev,
    aiTimeseries,
    aiByType,
    aiTopUsers,
    contentByStatus,
    contentByType,
    recentContent,
    schedulingByPlatform,
    upcoming,
    tgMembers,
    tgActiveMembers7d,
    tgMessages,
    tgTimeseriesRaw,
    tgTopContributors,
  ] = await Promise.all([
    prisma.contentPiece.count({ where: { createdAt: { gte: start } } }).catch(() => 0),
    prisma.contentPiece
      .count({ where: { createdAt: { gte: prevStart, lt: start } } })
      .catch(() => 0),
    prisma.aIJob.count({ where: { createdAt: { gte: start } } }).catch(() => 0),
    prisma.aIJob
      .count({ where: { createdAt: { gte: prevStart, lt: start } } })
      .catch(() => 0),
    prisma.scheduledPost.count({ where: { createdAt: { gte: start } } }).catch(() => 0),
    prisma.scheduledPost
      .count({ where: { createdAt: { gte: prevStart, lt: start } } })
      .catch(() => 0),
    prisma.aIJob
      .aggregate({
        _sum: { costUsd: true, totalTokens: true },
        where: { createdAt: { gte: start } },
      })
      .catch(() => ({ _sum: { costUsd: null, totalTokens: null } })),
    prisma.aIJob
      .aggregate({
        _sum: { costUsd: true },
        where: { createdAt: { gte: prevStart, lt: start } },
      })
      .catch(() => ({ _sum: { costUsd: null } })),
    prisma.aIJob
      .findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true, totalTokens: true, costUsd: true },
      })
      .catch(() => []),
    prisma.contentPiece
      .groupBy({
        by: ["type"],
        where: { aiGenerated: true, createdAt: { gte: start } },
        _count: { _all: true },
      })
      .catch(() => []),
    prisma.aIJob
      .groupBy({
        by: ["triggeredById"],
        where: { createdAt: { gte: start } },
        _count: { _all: true },
        _sum: { costUsd: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      })
      .catch(() => []),
    prisma.contentPiece
      .groupBy({ by: ["status"], _count: { _all: true } })
      .catch(() => []),
    prisma.contentPiece
      .groupBy({ by: ["type"], _count: { _all: true } })
      .catch(() => []),
    prisma.contentPiece
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, type: true, status: true, createdAt: true },
      })
      .catch(() => []),
    prisma.scheduledPost
      .groupBy({
        by: ["platform", "status"],
        where: { createdAt: { gte: start } },
        _count: { _all: true },
      })
      .catch(() => []),
    prisma.scheduledPost
      .findMany({
        where: {
          scheduledFor: { gte: now },
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        orderBy: { scheduledFor: "asc" },
        take: 5,
        include: { content: { select: { title: true } } },
      })
      .catch(() => []),
    prisma.telegramMember.count().catch(() => 0),
    prisma.telegramMember
      .count({
        where: { lastActivityAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      })
      .catch(() => 0),
    prisma.telegramMessage
      .count({ where: { sentAt: { gte: start } } })
      .catch(() => 0),
    prisma.telegramMessage
      .findMany({
        where: { sentAt: { gte: start } },
        select: { sentAt: true },
      })
      .catch(() => []),
    prisma.telegramMember
      .findMany({
        orderBy: { contributionScore: "desc" },
        take: 5,
        select: { firstName: true, username: true, contributionScore: true },
      })
      .catch(() => []),
  ]);

  // Build time-series (zero-filled across the range)
  const aiDayBuckets = bucketize(
    aiTimeseries.map((j) => ({ day: j.createdAt })),
    range,
  );
  const aiTokenBuckets = new Map<string, number>(
    Array.from(aiDayBuckets.keys()).map((k) => [k, 0]),
  );
  const aiCostBuckets = new Map<string, number>(
    Array.from(aiDayBuckets.keys()).map((k) => [k, 0]),
  );
  for (const j of aiTimeseries) {
    const k = j.createdAt.toISOString().slice(0, 10);
    if (aiTokenBuckets.has(k)) {
      aiTokenBuckets.set(k, (aiTokenBuckets.get(k) ?? 0) + (j.totalTokens ?? 0));
      aiCostBuckets.set(
        k,
        (aiCostBuckets.get(k) ?? 0) + Number(j.costUsd ?? 0),
      );
    }
  }

  const tgBuckets = bucketize(
    tgTimeseriesRaw.map((m) => ({ day: m.sentAt })),
    range,
  );

  // Resolve user names for top users
  const userIds = aiTopUsers.map((u) => u.triggeredById).filter(Boolean) as string[];
  const userRows =
    userIds.length > 0
      ? await prisma.user
          .findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, email: true },
          })
          .catch(() => [])
      : [];
  const userMap = new Map(
    userRows.map((u) => [u.id, u.fullName ?? u.email.split("@")[0]]),
  );

  // Collapse scheduling by platform
  const schedMap = new Map<
    string,
    { platform: string; queued: number; published: number; failed: number }
  >();
  for (const row of schedulingByPlatform) {
    const existing =
      schedMap.get(row.platform) ?? {
        platform: row.platform,
        queued: 0,
        published: 0,
        failed: 0,
      };
    if (row.status === "QUEUED" || row.status === "PROCESSING")
      existing.queued += row._count._all;
    if (row.status === "PUBLISHED") existing.published += row._count._all;
    if (row.status === "FAILED") existing.failed += row._count._all;
    schedMap.set(row.platform, existing);
  }
  const totalSched = Array.from(schedMap.values()).reduce(
    (a, b) => a + b.queued + b.published + b.failed,
    0,
  );
  const totalPublished = Array.from(schedMap.values()).reduce(
    (a, b) => a + b.published,
    0,
  );
  const successRate = totalSched > 0 ? totalPublished / totalSched : 0;

  // WordPress live numbers
  let wp: AnalyticsSnapshot["wordpress"] = { connected: false };
  if (wpIsConfigured()) {
    const [stats, recent] = await Promise.all([wpGetStats(), wpListPosts({ perPage: 6 })]);
    wp = {
      connected: true,
      stats: stats.ok ? stats.value : undefined,
      recent: recent.ok
        ? recent.value.map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            date: p.date,
            link: p.link,
          }))
        : undefined,
    };
  }

  // GA4 (audience analytics for the public WordPress site)
  let ga4: AnalyticsSnapshot["ga4"] = { connected: false };
  if (isGA4Configured()) {
    const r = await getGA4Summary(range);
    ga4 = r.ok ? { connected: true, ...r.value } : { connected: false, reason: r.error.message };
  }

  // GSC (search performance — keywords, rankings, CTR)
  let gsc: AnalyticsSnapshot["gsc"] = { connected: false };
  if (isGSCConfigured()) {
    const r = await getGSCSummary(range);
    gsc = r.ok ? { connected: true, ...r.value } : { connected: false, reason: r.error.message };
  }

  return {
    range,
    generatedAt: now.toISOString(),
    kpis: {
      contentCreated: {
        value: contentCurr,
        deltaPct: pctDelta(contentCurr, contentPrev),
      },
      aiGenerations: {
        value: aiJobsCurr,
        deltaPct: pctDelta(aiJobsCurr, aiJobsPrev),
      },
      scheduledPosts: {
        value: scheduledCurr,
        deltaPct: pctDelta(scheduledCurr, scheduledPrev),
      },
      aiSpendUsd: {
        value: Number(spendCurr._sum.costUsd ?? 0),
        deltaPct: pctDelta(
          Number(spendCurr._sum.costUsd ?? 0),
          Number(spendPrev._sum.costUsd ?? 0),
        ),
      },
    },
    aiUsage: {
      timeseries: Array.from(aiDayBuckets.entries()).map(([date, jobs]) => ({
        date,
        jobs,
        tokens: aiTokenBuckets.get(date) ?? 0,
        costUsd: Number((aiCostBuckets.get(date) ?? 0).toFixed(4)),
      })),
      byContentType: aiByType.map((row) => ({
        type: row.type,
        count: row._count._all,
      })),
      topUsers: aiTopUsers.map((u) => ({
        name: u.triggeredById
          ? userMap.get(u.triggeredById) ?? "Unknown"
          : "(system)",
        jobs: u._count._all,
        costUsd: Number(u._sum.costUsd ?? 0),
      })),
      totalTokens: Number(spendCurr._sum.totalTokens ?? 0),
      totalCostUsd: Number(spendCurr._sum.costUsd ?? 0),
    },
    content: {
      byStatus: contentByStatus.map((r) => ({
        status: r.status,
        count: r._count._all,
      })),
      byType: contentByType.map((r) => ({
        type: r.type,
        count: r._count._all,
      })),
      recent: recentContent.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      })),
    },
    scheduling: {
      byPlatform: Array.from(schedMap.values()),
      successRate,
      totalScheduled: totalSched,
      upcoming: upcoming.map((p) => ({
        id: p.id,
        title: p.content?.title ?? "Untitled",
        platform: p.platform,
        scheduledFor: p.scheduledFor.toISOString(),
      })),
    },
    wordpress: wp,
    ga4,
    gsc,
    telegram: {
      members: tgMembers,
      activeMembers7d: tgActiveMembers7d,
      messages: tgMessages,
      timeseries: Array.from(tgBuckets.entries()).map(([date, messages]) => ({
        date,
        messages,
        newMembers: 0,
      })),
      topContributors: tgTopContributors.map((m) => ({
        name: m.firstName ?? m.username ?? "Unknown",
        score: m.contributionScore,
      })),
    },
  };
}
