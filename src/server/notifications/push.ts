import "server-only";
import webpush from "web-push";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export function pushConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

let configured = false;
function ensureVapid() {
  if (configured) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
  configured = true;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/**
 * Push to every device a user has enabled. Dead subscriptions (410/404)
 * are deleted so they stop costing a request. Never throws.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; removed: number; skipped?: string }> {
  if (!pushConfigured()) return { sent: 0, removed: 0, skipped: "push not configured" };
  ensureVapid();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 12 },
        );
        sent++;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
      } catch (e) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
          removed++;
        }
      }
    }),
  );
  return { sent, removed };
}
