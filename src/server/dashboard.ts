import { prisma } from "@/lib/prisma";

/**
 * Server-side data loader for the Mission Control dashboard.
 * Gracefully degrades to demo data when the database is unavailable —
 * letting the UI render on first deploy before migrations have run.
 */
export async function getDashboardSnapshot() {
  try {
    const [scheduled, totalContent, aiJobsRecent, telegramMembers, telegramMsgs] =
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
      ]);

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
    };
  } catch {
    return demoSnapshot();
  }
}

function demoSnapshot() {
  const now = Date.now();
  return {
    live: false,
    stats: {
      scheduledCount: 12,
      totalContent: 187,
      aiJobsRecent: 64,
      telegramMembers: 348,
      telegramMsgs: 1244,
    },
    queue: [
      {
        id: "demo-1",
        title: "Sunday Reflection — The Slow Burn of Faith",
        platform: "INSTAGRAM" as const,
        scheduledFor: new Date(now + 1000 * 60 * 60 * 3).toISOString(),
        status: "QUEUED" as const,
      },
      {
        id: "demo-2",
        title: "Brotherhood Ride Recap — Highway 1",
        platform: "TELEGRAM" as const,
        scheduledFor: new Date(now + 1000 * 60 * 60 * 6).toISOString(),
        status: "QUEUED" as const,
      },
      {
        id: "demo-3",
        title: "Cigar of the Week: The Padron Aniversario",
        platform: "WORDPRESS" as const,
        scheduledFor: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
        status: "QUEUED" as const,
      },
      {
        id: "demo-4",
        title: "Lounge Stories Vol. 4 — Echoes from El Paso",
        platform: "YOUTUBE" as const,
        scheduledFor: new Date(now + 1000 * 60 * 60 * 48).toISOString(),
        status: "PROCESSING" as const,
      },
    ],
  };
}

export function demoEngagementSeries() {
  const days = 14;
  const out: { date: string; engagement: number; reach: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = 600 + Math.sin(i / 2) * 220 + Math.random() * 180;
    out.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      engagement: Math.round(base),
      reach: Math.round(base * (2.8 + Math.random() * 0.6)),
    });
  }
  return out;
}
