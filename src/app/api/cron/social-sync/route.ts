import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { instagramConfigured } from "@/server/integrations/meta";
import { syncTaggedMedia } from "@/server/social/sync";
import { audit } from "@/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily poll for media the account is tagged in (Vercel Hobby allows daily crons only). Caption and comment
 * mentions arrive by webhook; photo tags have no webhook, so we poll.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (env.CRON_SECRET && auth !== `Bearer ${env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!instagramConfigured()) {
    return Response.json({ ok: true, skipped: "instagram not configured" });
  }
  const r = await syncTaggedMedia();
  await audit("cron.social_sync", { diff: r });
  if (!r.ok) return Response.json({ ok: false, error: r.error }, { status: 502 });
  return Response.json(r);
}
