import { prisma } from "@/lib/prisma";
import {
  isConfigured as wpIsConfigured,
  listPosts as wpListPosts,
} from "@/server/integrations/wordpress";
import { getLatestImports } from "@/server/analytics/imports";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // ISO
  source: "WORDPRESS" | "TELEGRAM" | "INSTAGRAM" | "FACEBOOK" | "INTERNAL";
  status:
    | "published"
    | "scheduled"
    | "draft"
    | "pending"
    | "queued"
    | "failed";
  url?: string;
};

export type CalendarMonth = {
  year: number;
  month: number; // 0-11
  events: CalendarEvent[];
  counts: {
    published: number;
    scheduled: number;
    drafts: number;
  };
};

export async function getCalendarMonth(year: number, month: number): Promise<CalendarMonth> {
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const events: CalendarEvent[] = [];

  // ── 1. Internal EmberOS scheduled posts ─────────────────────
  try {
    const internal = await prisma.scheduledPost.findMany({
      where: { scheduledFor: { gte: start, lt: end } },
      include: { content: { select: { title: true } } },
    });
    for (const p of internal) {
      events.push({
        id: `internal-${p.id}`,
        title: p.content?.title ?? "Untitled",
        date: p.scheduledFor.toISOString(),
        source:
          p.platform === "WORDPRESS"
            ? "WORDPRESS"
            : p.platform === "TELEGRAM"
              ? "TELEGRAM"
              : p.platform === "INSTAGRAM"
                ? "INSTAGRAM"
                : p.platform === "FACEBOOK"
                  ? "FACEBOOK"
                  : "INTERNAL",
        status:
          p.status === "PUBLISHED"
            ? "published"
            : p.status === "FAILED"
              ? "failed"
              : "queued",
        url: p.externalUrl ?? undefined,
      });
    }
  } catch {
    // ignore
  }

  // ── 2. WordPress posts (any status) within the month ────────
  if (wpIsConfigured()) {
    const r = await wpListPosts({
      perPage: 100,
      status: "any",
      after: start,
      before: end,
    });
    if (r.ok) {
      for (const p of r.value) {
        events.push({
          id: `wp-${p.id}`,
          title: p.title || "(untitled)",
          date: p.date,
          source: "WORDPRESS",
          status:
            p.status === "publish"
              ? "published"
              : p.status === "future"
                ? "scheduled"
                : p.status === "pending"
                  ? "pending"
                  : "draft",
          url: p.link,
        });
      }
    }
  }

  // ── 3. Imported Meta posts that fall in the month (historical) ──
  try {
    const imports = await getLatestImports();
    for (const imp of imports) {
      if (imp.source !== "INSTAGRAM" && imp.source !== "FACEBOOK") continue;
      for (const post of imp.topEntities) {
        const rawDate = String(post.publishedAt ?? "");
        if (!rawDate) continue;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) continue;
        if (d < start || d >= end) continue;
        events.push({
          id: `${imp.source.toLowerCase()}-${String(post.postId ?? d.getTime())}`,
          title:
            String(post.caption ?? post.postId ?? "Post").slice(0, 80) ||
            "Post",
          date: d.toISOString(),
          source: imp.source as "INSTAGRAM" | "FACEBOOK",
          status: "published",
          url: post.permalink ? String(post.permalink) : undefined,
        });
      }
    }
  } catch {
    // ignore
  }

  // Dedupe by source + date + title (in case multiple imports overlap)
  const seen = new Set<string>();
  const deduped = events.filter((e) => {
    const key = `${e.source}::${e.date.slice(0, 10)}::${e.title.slice(0, 30)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const counts = deduped.reduce(
    (acc, e) => {
      if (e.status === "published") acc.published += 1;
      else if (e.status === "scheduled" || e.status === "queued")
        acc.scheduled += 1;
      else if (e.status === "draft") acc.drafts += 1;
      return acc;
    },
    { published: 0, scheduled: 0, drafts: 0 },
  );

  return {
    year,
    month,
    events: deduped.sort((a, b) => a.date.localeCompare(b.date)),
    counts,
  };
}
