import { NextRequest } from "next/server";
import { Receiver } from "@upstash/qstash";
import { env } from "@/lib/env";
import { executeScheduledPost } from "@/server/scheduling/publish-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _receiver: Receiver | null = null;
function receiver() {
  if (_receiver) return _receiver;
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) {
    return null;
  }
  _receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
  return _receiver;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("upstash-signature");

  // Verify QStash signature in production
  const r = receiver();
  if (r) {
    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 401 });
    }
    const valid = await r
      .verify({ body, signature })
      .catch(() => false);
    if (!valid) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (env.NODE_ENV === "production") {
    return Response.json(
      { error: "QStash signing keys not configured" },
      { status: 500 },
    );
  }

  const parsed = JSON.parse(body) as { scheduledPostId: string };
  if (!parsed?.scheduledPostId) {
    return Response.json({ error: "scheduledPostId required" }, { status: 400 });
  }

  try {
    await executeScheduledPost(parsed.scheduledPostId);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 500 },
    );
  }
}
