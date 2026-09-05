import "server-only";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { taskToAction, type TaskLike } from "./tasks/logic";
import type { ActionItem } from "./dashboard/today-logic";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  completedAt: string | null;
  tags: string[];
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  linked: { kind: "customer" | "prospect" | "influencer" | "sale"; id: string; label: string; href: string } | null;
  createdAt: string;
};

export type TaskScope = "mine" | "open" | "done" | "created";

const include = {
  assignee: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  customer: { select: { id: true, businessName: true } },
  prospect: { select: { id: true, businessName: true } },
  influencer: { select: { id: true, name: true } },
  sale: { select: { id: true, invoiceNumber: true, customer: { select: { businessName: true } } } },
} satisfies Prisma.TaskInclude;

type TaskWithRels = Prisma.TaskGetPayload<{ include: typeof include }>;

const nameOf = (u: { id: string; fullName: string | null; email: string } | null) =>
  u ? { id: u.id, name: u.fullName ?? u.email } : null;

export function linkedOf(t: TaskWithRels): TaskRow["linked"] {
  if (t.customer) return { kind: "customer", id: t.customer.id, label: t.customer.businessName, href: `/crm/${t.customer.id}` };
  if (t.prospect) return { kind: "prospect", id: t.prospect.id, label: t.prospect.businessName, href: `/prospects/${t.prospect.id}` };
  if (t.influencer) return { kind: "influencer", id: t.influencer.id, label: t.influencer.name, href: `/influencers/${t.influencer.id}` };
  if (t.sale) return { kind: "sale", id: t.sale.id, label: `${t.sale.invoiceNumber} · ${t.sale.customer.businessName}`, href: `/sales/${t.sale.id}` };
  return null;
}

export function toRow(t: TaskWithRels): TaskRow {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueAt: t.dueAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    tags: t.tags,
    assignee: nameOf(t.assignee),
    createdBy: nameOf(t.createdBy),
    linked: linkedOf(t),
    createdAt: t.createdAt.toISOString(),
  };
}

export async function loadTasks(params: { scope: TaskScope; userId: string; assigneeId?: string; q?: string }) {
  const where: Prisma.TaskWhereInput =
    params.scope === "done"
      ? { status: "DONE" }
      : params.scope === "mine"
        ? { status: "OPEN", assigneeId: params.userId }
        : params.scope === "created"
          ? { status: "OPEN", createdById: params.userId }
          : { status: "OPEN" };
  if (params.assigneeId) where.assigneeId = params.assigneeId;
  if (params.q) where.title = { contains: params.q, mode: "insensitive" };

  const [rows, counts] = await Promise.all([
    prisma.task.findMany({
      where,
      include,
      orderBy: params.scope === "done" ? [{ completedAt: "desc" }] : [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    Promise.all([
      prisma.task.count({ where: { status: "OPEN", assigneeId: params.userId } }),
      prisma.task.count({ where: { status: "OPEN" } }),
      prisma.task.count({ where: { status: "OPEN", createdById: params.userId } }),
      prisma.task.count({ where: { status: "DONE" } }),
    ]),
  ]);
  return {
    rows: rows.map(toRow),
    counts: { mine: counts[0], open: counts[1], created: counts[2], done: counts[3] },
  };
}

export async function loadTask(id: string): Promise<TaskRow | null> {
  const t = await prisma.task.findUnique({ where: { id }, include });
  return t ? toRow(t) : null;
}

export async function loadAssignableUsers() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
    select: { id: true, fullName: true, email: true },
  });
  return users.map((u) => ({ id: u.id, name: u.fullName ?? u.email, email: u.email }));
}

/** Resolve the record a task is being created about, for the form header. */
export async function loadTaskContext(q: { customer?: string; prospect?: string; influencer?: string; sale?: string }) {
  if (q.customer) {
    const c = await prisma.customer.findUnique({ where: { id: q.customer }, select: { id: true, businessName: true } });
    return c ? { kind: "customer" as const, id: c.id, label: c.businessName } : null;
  }
  if (q.prospect) {
    const p = await prisma.prospect.findUnique({ where: { id: q.prospect }, select: { id: true, businessName: true, assignedToId: true } });
    return p ? { kind: "prospect" as const, id: p.id, label: p.businessName, suggestedAssigneeId: p.assignedToId } : null;
  }
  if (q.influencer) {
    const i = await prisma.influencer.findUnique({ where: { id: q.influencer }, select: { id: true, name: true, assignedToId: true } });
    return i ? { kind: "influencer" as const, id: i.id, label: i.name, suggestedAssigneeId: i.assignedToId } : null;
  }
  if (q.sale) {
    const s = await prisma.sale.findUnique({ where: { id: q.sale }, select: { id: true, invoiceNumber: true, customer: { select: { businessName: true } } } });
    return s ? { kind: "sale" as const, id: s.id, label: `${s.invoiceNumber} · ${s.customer.businessName}` } : null;
  }
  return null;
}

/** Open tasks assigned to a user, shaped for the Today board. */
export async function openTaskActions(userId: string, now: Date): Promise<ActionItem[]> {
  const rows = await prisma.task.findMany({
    where: { status: "OPEN", assigneeId: userId },
    include,
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }],
    take: 20,
  });
  return rows.map((t) => {
    const linked = linkedOf(t);
    const like: TaskLike = {
      id: t.id,
      title: t.title,
      dueAt: t.dueAt,
      priority: t.priority,
      linkedLabel: linked?.label ?? null,
      href: `/tasks?task=${t.id}`,
    };
    return taskToAction(like, now);
  });
}
