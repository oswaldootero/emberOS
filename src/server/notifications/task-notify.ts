import "server-only";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { emailLayout, sendEmail } from "./email";
import { sendPushToUser } from "./push";
import { dueLabel, groupReminders, reminderCopy, utcDayOf } from "@/server/tasks/logic";

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

/** Tell the assignee about a new/reassigned task by push + email. */
export async function notifyTaskAssigned(taskId: string, actorId: string | null): Promise<void> {
  const t = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, email: true, fullName: true } },
      createdBy: { select: { fullName: true, email: true } },
      customer: { select: { businessName: true } },
      prospect: { select: { businessName: true } },
      influencer: { select: { name: true } },
      sale: { select: { invoiceNumber: true } },
    },
  });
  if (!t?.assignee || t.assignee.id === actorId) return;

  const who = t.createdBy?.fullName ?? t.createdBy?.email ?? "A teammate";
  const about =
    t.customer?.businessName ?? t.prospect?.businessName ?? t.influencer?.name ?? t.sale?.invoiceNumber ?? null;
  const due = t.dueAt ? `Due ${dueLabel(t.dueAt, new Date())}` : "No due date";
  const url = `${appUrl()}/tasks?task=${t.id}`;

  const push = sendPushToUser(t.assignee.id, {
    title: `${who} assigned you a task`,
    body: `${t.title}${about ? ` · ${about}` : ""} · ${due}`,
    url,
    tag: `task-${t.id}`,
  });
  const { html, text } = emailLayout({
    heading: t.title,
    lines: [
      `${who} assigned this to you.`,
      about ? `About: ${about}` : "",
      due,
      t.description ? `Notes: ${t.description}` : "",
    ].filter(Boolean),
    ctaLabel: "Open in EmberOS",
    ctaUrl: url,
  });
  const email = sendEmail({ to: t.assignee.email, subject: `Task for you: ${t.title}`, html, text });
  await Promise.all([push, email]);
  await prisma.task.update({ where: { id: t.id }, data: { assignedNotifiedAt: new Date() } });
}

/** Once a day: one push + one email per assignee with today's and overdue tasks. */
export async function sendDueReminders(now = new Date()): Promise<{ users: number; tasks: number; pushSent: number; emailsSent: number }> {
  const today = utcDayOf(now);
  const due = await prisma.task.findMany({
    where: {
      status: "OPEN",
      assigneeId: { not: null },
      dueAt: { lt: new Date(today.getTime() + 86400000) },
      OR: [{ reminderSentOn: null }, { reminderSentOn: { lt: today } }],
    },
    select: { id: true, title: true, dueAt: true, assigneeId: true },
  });
  const groups = groupReminders(due, now);
  let pushSent = 0;
  let emailsSent = 0;
  for (const [userId, g] of groups) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, isActive: true } });
    if (!user?.isActive) continue;
    const copy = reminderCopy(g);
    const url = `${appUrl()}/tasks`;
    const items = [...g.overdue, ...g.today];
    const r = await sendPushToUser(userId, { title: copy.title, body: copy.body, url, tag: "task-reminders" });
    pushSent += r.sent;
    const { html, text } = emailLayout({
      heading: copy.title,
      lines: [copy.body + ".", ...items.slice(0, 8).map((t) => `• ${t.title} — ${dueLabel(t.dueAt, now)}`)],
      ctaLabel: "Open my tasks",
      ctaUrl: url,
    });
    const e = await sendEmail({ to: user.email, subject: `${copy.title} — ${copy.body}`, html, text });
    if (e.ok) emailsSent++;
    await prisma.task.updateMany({ where: { id: { in: items.map((t) => t.id) } }, data: { reminderSentOn: today } });
  }
  return { users: groups.size, tasks: due.length, pushSent, emailsSent };
}
