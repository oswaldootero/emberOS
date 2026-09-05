import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { instagramConfigured } from "@/server/integrations/meta";
import { syncTaggedMedia } from "@/server/social/sync";
import { generateHashtagBrief } from "@/server/social/scout";
import { audit } from "@/server/audit";
import { sendDueReminders } from "@/server/notifications/task-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily jobs (Vercel Hobby allows two daily crons per project, so these
 * share one route):
 *  1) Task reminders — one push + email per assignee for due/overdue tasks.
 *  2) Today's "hashtags to watch" brief via AI web research.
 *  3) If Instagram is connected, poll media the account is tagged in.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let reminders: unknown;
  try {
    reminders = await sendDueReminders();
  } catch (e) {
    reminders = { error: e instanceof Error ? e.message : String(e) };
  }

  let brief: { ok: boolean; hashtags?: number; error?: string } = { ok: false };
  try {
    const b = await generateHashtagBrief();
    brief = b ? { ok: true, hashtags: b.hashtags.length } : { ok: false, error: "no usable hashtags" };
  } catch (e) {
    brief = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const sync = instagramConfigured()
    ? await syncTaggedMedia()
    : ({ ok: true, skipped: "instagram not configured" } as const);

  await audit("cron.daily_jobs", { diff: { reminders, brief, sync } });
  return Response.json({ ok: true, reminders, brief, sync });
}
