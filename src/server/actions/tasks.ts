"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { notifyTaskAssigned } from "@/server/notifications/task-notify";
import { pushConfigured, sendPushToUser } from "@/server/notifications/push";
import { parseDueDate } from "@/server/tasks/logic";

export type TaskResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

const TaskSchema = z.object({
  title: z.string().trim().min(1, "Give the task a title").max(200),
  description: z.string().max(4000).optional().nullable(),
  dueDate: z.string().optional().nullable(), // yyyy-mm-dd
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  assigneeId: z.string().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  customerId: z.string().optional().nullable(),
  prospectId: z.string().optional().nullable(),
  influencerId: z.string().optional().nullable(),
  saleId: z.string().optional().nullable(),
});

function firstError(e: z.ZodError): string {
  const f = e.errors[0];
  return f ? f.message : "Invalid input";
}

function revalidateTasks(t?: { customerId?: string | null; prospectId?: string | null; influencerId?: string | null; saleId?: string | null }) {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (t?.customerId) revalidatePath(`/crm/${t.customerId}`);
  if (t?.prospectId) revalidatePath(`/prospects/${t.prospectId}`);
  if (t?.influencerId) revalidatePath(`/influencers/${t.influencerId}`);
  if (t?.saleId) revalidatePath(`/sales/${t.saleId}`);
}

export async function createTask(input: unknown): Promise<TaskResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = TaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  if (d.dueDate && !parseDueDate(d.dueDate)) return { ok: false, error: "Pick a valid due date." };

  const task = await prisma.task.create({
    data: {
      title: d.title,
      description: d.description || null,
      dueAt: parseDueDate(d.dueDate),
      priority: d.priority,
      assigneeId: d.assigneeId || null,
      createdById: user.id,
      tags: Array.from(new Set(d.tags.map((t) => t.toLowerCase()))),
      customerId: d.customerId || null,
      prospectId: d.prospectId || null,
      influencerId: d.influencerId || null,
      saleId: d.saleId || null,
    },
  });
  await audit("tasks.created", {
    actorId: user.id,
    entityType: "Task",
    entityId: task.id,
    diff: { title: task.title, assigneeId: task.assigneeId, dueAt: task.dueAt },
  });
  if (task.assigneeId) await notifyTaskAssigned(task.id, user.id).catch(() => undefined);
  revalidateTasks(task);
  return { ok: true, id: task.id };
}

export async function updateTask(id: string, input: unknown): Promise<TaskResult> {
  const user = await requireUser();
  const parsed = TaskSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const d = parsed.data;
  const before = await prisma.task.findUnique({ where: { id }, select: { assigneeId: true } });
  if (!before) return { ok: false, error: "Task not found." };
  if (d.dueDate && !parseDueDate(d.dueDate)) return { ok: false, error: "Pick a valid due date." };

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.description !== undefined ? { description: d.description || null } : {}),
      ...(d.dueDate !== undefined ? { dueAt: parseDueDate(d.dueDate) } : {}),
      ...(d.priority !== undefined ? { priority: d.priority } : {}),
      ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId || null } : {}),
      ...(d.tags !== undefined ? { tags: Array.from(new Set(d.tags.map((t) => t.toLowerCase()))) } : {}),
    },
  });
  await audit("tasks.updated", { actorId: user.id, entityType: "Task", entityId: id, diff: d });
  if (task.assigneeId && task.assigneeId !== before.assigneeId) {
    await notifyTaskAssigned(task.id, user.id).catch(() => undefined);
  }
  revalidateTasks(task);
  return { ok: true };
}

export async function setTaskStatus(id: string, status: "OPEN" | "DONE"): Promise<TaskResult> {
  const user = await requireUser();
  const task = await prisma.task.update({
    where: { id },
    data: { status, completedAt: status === "DONE" ? new Date() : null },
  });
  await audit(status === "DONE" ? "tasks.completed" : "tasks.reopened", { actorId: user.id, entityType: "Task", entityId: id });
  revalidateTasks(task);
  return { ok: true };
}

export async function deleteTask(id: string): Promise<TaskResult> {
  const user = await requireUser();
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "Task not found." };
  if (task.createdById !== user.id && task.assigneeId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "Only the creator, the assignee, or an admin can delete this." };
  }
  await prisma.task.delete({ where: { id } });
  await audit("tasks.deleted", { actorId: user.id, entityType: "Task", entityId: id, diff: { title: task.title } });
  revalidateTasks(task);
  return { ok: true };
}

// ── Push subscriptions ──────────────────────────────────────────

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  userAgent: z.string().max(300).optional().nullable(),
});

export async function savePushSubscription(input: unknown): Promise<TaskResult> {
  const user = await requireUser();
  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid subscription." };
  const s = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint: s.endpoint },
    create: { userId: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: s.userAgent ?? null },
    update: { userId: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth, userAgent: s.userAgent ?? null },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<TaskResult> {
  const user = await requireUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { ok: true };
}

export async function sendTestPush(): Promise<TaskResult<{ sent: number }>> {
  const user = await requireUser();
  if (!pushConfigured()) return { ok: false, error: "Push isn't configured — add the VAPID keys." };
  const r = await sendPushToUser(user.id, {
    title: "EmberOS notifications are on",
    body: "You'll get a ping when a task is assigned to you and each morning for what's due.",
    url: "/tasks",
    tag: "test",
  });
  if (r.sent === 0) return { ok: false, error: "No devices are subscribed on this account yet." };
  return { ok: true, sent: r.sent };
}
