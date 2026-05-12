import { Client } from "@upstash/qstash";
import { env } from "@/lib/env";

let _client: Client | null = null;

export function qstash() {
  if (_client) return _client;
  if (!env.QSTASH_TOKEN) throw new Error("QSTASH_TOKEN not configured");
  _client = new Client({ token: env.QSTASH_TOKEN });
  return _client;
}

/**
 * Schedule a one-shot HTTP callback to /api/scheduling/publish at a future time.
 * Returns the QStash message id, which we persist on ScheduledPost for cancellation.
 */
export async function schedulePostPublish(opts: {
  scheduledPostId: string;
  notBefore: Date;
}) {
  const base = env.NEXT_PUBLIC_APP_URL;
  const message = await qstash().publishJSON({
    url: `${base}/api/scheduling/publish`,
    body: { scheduledPostId: opts.scheduledPostId },
    notBefore: Math.floor(opts.notBefore.getTime() / 1000),
    retries: 3,
  });
  return message.messageId;
}

export async function cancelScheduledPost(messageId: string) {
  await qstash().messages.delete(messageId);
}
