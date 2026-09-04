import { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { verifyMetaSignature } from "@/server/integrations/meta";
import { parseMentionWebhook } from "@/server/social/instagram";
import { ingestMentionEvents } from "@/server/social/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Meta webhook for the Instagram `mentions` field.
 *
 * GET  — one-time subscription handshake (hub.verify_token must match).
 * POST — signed notifications; each carries a media_id (+ comment_id for
 *        comment mentions). We resolve them through the Graph API and
 *        store them as SocialMention rows. Always answer 200 quickly so
 *        Meta doesn't retry or disable the subscription.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  if (
    mode === "subscribe" &&
    env.META_WEBHOOK_VERIFY_TOKEN &&
    token === env.META_WEBHOOK_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return Response.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return Response.json({ error: "Bad signature" }, { status: 401 });
  }
  let payload: unknown = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ ok: true, ignored: "unparseable" });
  }
  const events = parseMentionWebhook(payload);
  if (events.length === 0) return Response.json({ ok: true, received: 0 });

  try {
    const counts = await ingestMentionEvents(events);
    return Response.json({ ok: true, received: events.length, ...counts });
  } catch (e) {
    // Log but still 200 — a failed lookup shouldn't get the subscription disabled.
    console.error("[meta webhook] ingest failed", e);
    return Response.json({ ok: true, received: events.length, stored: 0 });
  }
}
