"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { pushConfigured, sendPushToUser } from "@/server/notifications/push";
import { motivationPayload } from "@/server/notifications/motivation";
import { quoteForDay } from "@/server/motivation/pick";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Turn the daily motivation push on or off for the signed-in user. */
export async function setDailyMotivation(enabled: boolean): Promise<Result> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { dailyMotivation: Boolean(enabled) } });
  revalidatePath("/settings");
  return { ok: true };
}

/** Send today's quote to the signed-in user's devices right now. */
export async function sendTestMotivation(): Promise<Result<{ sent: number }>> {
  const user = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Push isn't configured — add the VAPID keys." };
  const r = await sendPushToUser(user.id, motivationPayload(quoteForDay()));
  if (r.sent === 0) return { ok: false, error: "No devices are subscribed on this account yet. Enable notifications first." };
  return { ok: true, sent: r.sent };
}
