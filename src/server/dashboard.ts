import "server-only";
import { prisma } from "@/lib/prisma";
import { predictReorders } from "@/server/crm/predict-reorders";
import { getHashtagBrief, type StoredBrief } from "@/server/social/scout";
import { openTaskActions } from "@/server/tasks";
import {
  daysBetween,
  monthBuckets,
  monthKeyOf,
  percentChange,
  sortActions,
  urgencyFor,
  type ActionItem,
} from "./dashboard/today-logic";

const REVENUE_STATUSES = ["SENT", "PAID", "PARTIAL", "OVERDUE"] as const;
const OUTSTANDING_STATUSES = ["SENT", "PARTIAL", "OVERDUE"] as const;
const OPEN_PROSPECT_STAGES = [
  "LEAD", "QUALIFIED", "CONTACTED", "MEETING_SCHEDULED", "MEETING_COMPLETED", "SAMPLES_DELIVERED", "NEGOTIATION",
] as const;

const n = (v: unknown) => (v == null ? 0 : Number(v.toString()));
const usd = (v: number) => Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export type TodayBoard = {
  kpis: {
    revenueThisMonth: number;
    revenueDeltaPct: number | null;
    outstanding: number;
    overdueAmount: number;
    overdueCount: number;
    openProspects: number;
    lowStockCount: number;
  };
  actions: ActionItem[];
  actionOverflow: number;
  revenueByMonth: { month: string; revenue: number }[];
  topCustomersThisMonth: { id: string; name: string; revenue: number; invoices: number }[];
  pipeline: { stage: string; count: number }[];
  hashtagBrief: StoredBrief | null;
};

const MAX_ACTIONS = 14;

/**
 * Everything the founder should look at today, in one query burst. Each
 * source contributes ActionItems; a future task module contributes the
 * same way (kind: "task", due, href) and nothing else changes.
 */
export async function loadTodayBoard(userId: string, now = new Date()): Promise<TodayBoard> {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const soon = new Date(now.getTime() + 7 * 86400000);
  const followupHorizon = new Date(now.getTime() + 3 * 86400000);
  const shipmentCheckIn = new Date(now.getTime() - 14 * 86400000);
  const shipmentStale = new Date(now.getTime() - 60 * 86400000);

  const [
    salesRecent,
    outstandingRows,
    dueInvoices,
    customerFollowups,
    prospectFollowups,
    prospectTasks,
    influencerFollowups,
    quietShipments,
    newMentions,
    lowStock,
    pipelineGroups,
    brief,
    myTasks,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { status: { in: [...REVENUE_STATUSES] }, invoiceDate: { gte: sixMonthsAgo } },
      select: { invoiceDate: true, grandTotal: true, customerId: true, customer: { select: { businessName: true } } },
    }),
    prisma.sale.findMany({
      where: { status: { in: [...OUTSTANDING_STATUSES] } },
      select: { grandTotal: true, amountPaid: true, dueDate: true },
    }),
    prisma.sale.findMany({
      where: { status: { in: [...OUTSTANDING_STATUSES] }, dueDate: { lte: soon } },
      orderBy: { dueDate: "asc" },
      take: 8,
      select: { id: true, invoiceNumber: true, dueDate: true, grandTotal: true, amountPaid: true, customer: { select: { businessName: true } } },
    }),
    prisma.customer.findMany({
      where: { archivedAt: null, nextFollowupDate: { lte: followupHorizon }, status: { notIn: ["LOST", "INACTIVE"] } },
      orderBy: { nextFollowupDate: "asc" },
      take: 6,
      select: { id: true, businessName: true, nextFollowupDate: true },
    }),
    prisma.prospect.findMany({
      where: { archivedAt: null, customerId: null, nextFollowupDate: { lte: followupHorizon }, stage: { in: [...OPEN_PROSPECT_STAGES] } },
      orderBy: { nextFollowupDate: "asc" },
      take: 6,
      select: { id: true, businessName: true, city: true, nextFollowupDate: true },
    }),
    prisma.prospectActivity.findMany({
      where: { kind: "TASK", completedAt: null, dueAt: { lte: followupHorizon } },
      orderBy: { dueAt: "asc" },
      take: 6,
      select: { id: true, summary: true, dueAt: true, prospect: { select: { id: true, businessName: true } } },
    }),
    prisma.influencer.findMany({
      where: { archivedAt: null, nextFollowupDate: { lte: followupHorizon }, stage: { notIn: ["DECLINED", "INACTIVE"] } },
      orderBy: { nextFollowupDate: "asc" },
      take: 4,
      select: { id: true, name: true, handle: true, nextFollowupDate: true },
    }),
    prisma.influencerShipment.findMany({
      where: {
        sentAt: { lte: shipmentCheckIn, gte: shipmentStale },
        influencer: { archivedAt: null, posts: { none: { postedAt: { gte: shipmentCheckIn } } } },
      },
      orderBy: { sentAt: "desc" },
      take: 4,
      select: { id: true, sentAt: true, cigarCount: true, influencer: { select: { id: true, name: true, handle: true } } },
    }),
    prisma.socialMention.count({ where: { status: "NEW" } }),
    prisma.$queryRaw<{ id: string; sku: string; productName: string; packagesOnHand: number; reorderThreshold: number }[]>`
      SELECT id, sku, "productName", "packagesOnHand", "reorderThreshold"
      FROM "InventoryItem"
      WHERE status <> 'DISCONTINUED' AND "reorderThreshold" > 0 AND "packagesOnHand" <= "reorderThreshold"
      ORDER BY ("packagesOnHand"::float / NULLIF("reorderThreshold", 0)) ASC
      LIMIT 20`,
    prisma.prospect.groupBy({
      by: ["stage"],
      where: { archivedAt: null, customerId: null, stage: { in: [...OPEN_PROSPECT_STAGES] } },
      _count: { _all: true },
    }),
    getHashtagBrief().catch(() => null),
    openTaskActions(userId, now),
  ]);

  // ── Sales pulse ──────────────────────────────────────────────
  const thisKey = monthKeyOf(startOfMonth);
  const lastKey = monthKeyOf(startOfLastMonth);
  const byMonth = new Map<string, number>();
  const byCustomer = new Map<string, { id: string; name: string; revenue: number; invoices: number }>();
  for (const s of salesRecent) {
    const k = monthKeyOf(s.invoiceDate);
    byMonth.set(k, (byMonth.get(k) ?? 0) + n(s.grandTotal));
    if (k === thisKey) {
      const c = byCustomer.get(s.customerId) ?? { id: s.customerId, name: s.customer.businessName, revenue: 0, invoices: 0 };
      c.revenue += n(s.grandTotal);
      c.invoices += 1;
      byCustomer.set(s.customerId, c);
    }
  }
  const revenueThisMonth = byMonth.get(thisKey) ?? 0;
  const revenueLastMonth = byMonth.get(lastKey) ?? 0;
  const outstanding = outstandingRows.reduce((s, r) => s + Math.max(0, n(r.grandTotal) - n(r.amountPaid)), 0);
  const overdueRows = outstandingRows.filter((r) => r.dueDate && r.dueDate < now);
  const overdueAmount = overdueRows.reduce((s, r) => s + Math.max(0, n(r.grandTotal) - n(r.amountPaid)), 0);

  // ── Action items ─────────────────────────────────────────────
  const actions: ActionItem[] = [...myTasks];

  for (const inv of dueInvoices) {
    const balance = Math.max(0, n(inv.grandTotal) - n(inv.amountPaid));
    const due = inv.dueDate!;
    const u = urgencyFor(due, now, 7);
    const days = daysBetween(due, now);
    actions.push({
      id: `inv-${inv.id}`,
      kind: "invoice",
      title: u === "overdue" ? `Collect ${usd(balance)} from ${inv.customer.businessName}` : `${inv.customer.businessName} owes ${usd(balance)}`,
      detail: u === "overdue" ? `${inv.invoiceNumber} · ${days} day${days === 1 ? "" : "s"} overdue` : `${inv.invoiceNumber} · due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`,
      href: `/sales/${inv.id}`,
      due: due.toISOString(),
      urgency: u,
    });
  }

  for (const c of customerFollowups) {
    actions.push({
      id: `cust-${c.id}`,
      kind: "customer",
      title: `Follow up with ${c.businessName}`,
      detail: "Customer follow-up",
      href: `/crm/${c.id}`,
      due: c.nextFollowupDate!.toISOString(),
      urgency: urgencyFor(c.nextFollowupDate, now),
    });
  }

  for (const p of prospectFollowups) {
    actions.push({
      id: `pros-${p.id}`,
      kind: "prospect",
      title: `Reach out to ${p.businessName}`,
      detail: `Prospect follow-up${p.city ? ` · ${p.city}` : ""}`,
      href: `/prospects/${p.id}`,
      due: p.nextFollowupDate!.toISOString(),
      urgency: urgencyFor(p.nextFollowupDate, now),
    });
  }

  for (const t of prospectTasks) {
    actions.push({
      id: `task-${t.id}`,
      kind: "task",
      title: t.summary,
      detail: `Task · ${t.prospect.businessName}`,
      href: `/prospects/${t.prospect.id}`,
      due: t.dueAt!.toISOString(),
      urgency: urgencyFor(t.dueAt, now),
    });
  }

  for (const i of influencerFollowups) {
    actions.push({
      id: `inf-${i.id}`,
      kind: "influencer",
      title: `Check in with ${i.name}`,
      detail: i.handle ? `@${i.handle} · influencer follow-up` : "Influencer follow-up",
      href: `/influencers/${i.id}`,
      due: i.nextFollowupDate!.toISOString(),
      urgency: urgencyFor(i.nextFollowupDate, now),
    });
  }

  const seenInf = new Set(influencerFollowups.map((i) => i.id));
  for (const s of quietShipments) {
    if (seenInf.has(s.influencer.id)) continue;
    seenInf.add(s.influencer.id);
    actions.push({
      id: `ship-${s.id}`,
      kind: "influencer",
      title: `${s.influencer.name} hasn't posted since the cigars arrived`,
      detail: `${s.cigarCount} cigars sent ${daysBetween(s.sentAt, now)} days ago · nudge them`,
      href: `/influencers/${s.influencer.id}`,
      due: null,
      urgency: "soon",
    });
  }

  const reorders = predictReorders(
    salesRecent.map((s) => ({ customerId: s.customerId, customerName: s.customer.businessName, invoiceDate: s.invoiceDate, grandTotal: n(s.grandTotal) })),
    now,
    6,
  ).filter((r) => r.daysUntil <= 7);
  for (const r of reorders) {
    actions.push({
      id: `reorder-${r.customerId}`,
      kind: "reorder",
      title: `${r.customerName} is due to reorder`,
      detail: `Orders about every ${r.avgDaysBetween} days · last ${usd(r.lastTotal)}`,
      href: `/crm/${r.customerId}`,
      due: r.predictedDate,
      urgency: r.daysUntil < 0 ? "overdue" : r.daysUntil === 0 ? "today" : "soon",
    });
  }

  if (newMentions > 0) {
    actions.push({
      id: "mentions",
      kind: "mention",
      title: `Review ${newMentions} new Instagram mention${newMentions === 1 ? "" : "s"}`,
      detail: "Turn them into influencers or prospects",
      href: "/social/mentions",
      due: null,
      urgency: "today",
    });
  }

  for (const item of lowStock.slice(0, 3)) {
    actions.push({
      id: `stock-${item.id}`,
      kind: "stock",
      title: item.packagesOnHand === 0 ? `${item.productName} is out of stock` : `Reorder ${item.productName}`,
      detail: `${item.sku} · ${item.packagesOnHand} on hand, threshold ${item.reorderThreshold}`,
      href: `/inventory/${item.id}`,
      due: null,
      urgency: item.packagesOnHand === 0 ? "today" : "soon",
    });
  }

  if (!brief) {
    actions.push({
      id: "brief",
      kind: "social",
      title: "Build today's hashtag brief",
      detail: "AI research on what's moving in the cigar corner of Instagram",
      href: "/social/find",
      due: null,
      urgency: "info",
    });
  }

  const sorted = sortActions(actions);

  return {
    kpis: {
      revenueThisMonth,
      revenueDeltaPct: percentChange(revenueThisMonth, revenueLastMonth),
      outstanding,
      overdueAmount,
      overdueCount: overdueRows.length,
      openProspects: pipelineGroups.reduce((s, g) => s + g._count._all, 0),
      lowStockCount: lowStock.length,
    },
    actions: sorted.slice(0, MAX_ACTIONS),
    actionOverflow: Math.max(0, sorted.length - MAX_ACTIONS),
    revenueByMonth: monthBuckets(now, 6).map((m) => ({ month: m.label, revenue: byMonth.get(m.key) ?? 0 })),
    topCustomersThisMonth: Array.from(byCustomer.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    pipeline: OPEN_PROSPECT_STAGES.map((stage) => ({
      stage,
      count: pipelineGroups.find((g) => g.stage === stage)?._count._all ?? 0,
    })),
    hashtagBrief: brief,
  };
}
