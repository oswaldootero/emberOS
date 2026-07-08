import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, ProspectStage, ProspectVerdict } from "@prisma/client";
import { n } from "@/server/sales";

export const PROSPECTS_PAGE_SIZE = 25;

export const STAGES: { value: ProspectStage; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "MEETING_SCHEDULED", label: "Meeting scheduled" },
  { value: "MEETING_COMPLETED", label: "Meeting completed" },
  { value: "SAMPLES_DELIVERED", label: "Samples delivered" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "FIRST_ORDER", label: "First order" },
  { value: "ACTIVE_CUSTOMER", label: "Active customer" },
  { value: "VIP_CUSTOMER", label: "VIP customer" },
  { value: "LOST", label: "Lost" },
];

export type ProspectListParams = {
  q?: string;
  stage?: ProspectStage | "";
  state?: string;
  city?: string;
  minScore?: number;
  verdict?: ProspectVerdict | "";
  dna?: string[];
  needsFollowUp?: boolean;
  assignedToId?: string;
  archived?: boolean;
  sort?: "aiScore" | "updatedAt" | "businessName" | "nextFollowupDate" | "createdAt";
  dir?: "asc" | "desc";
  page?: number;
};

export function buildProspectWhere(p: ProspectListParams): Prisma.ProspectWhereInput {
  return {
    archivedAt: p.archived ? { not: null } : null,
    ...(p.q
      ? {
          OR: [
            { businessName: { contains: p.q, mode: "insensitive" } },
            { dba: { contains: p.q, mode: "insensitive" } },
            { city: { contains: p.q, mode: "insensitive" } },
            { ownerName: { contains: p.q, mode: "insensitive" } },
            { tags: { has: p.q } },
          ],
        }
      : {}),
    ...(p.stage ? { stage: p.stage } : {}),
    ...(p.state ? { state: { equals: p.state, mode: "insensitive" } } : {}),
    ...(p.city ? { city: { contains: p.city, mode: "insensitive" } } : {}),
    ...(p.minScore != null ? { aiScore: { gte: p.minScore } } : {}),
    ...(p.verdict ? { aiVerdict: p.verdict } : {}),
    ...(p.dna?.length ? { aiDna: { hasSome: p.dna } } : {}),
    ...(p.needsFollowUp
      ? { nextFollowupDate: { lte: new Date(Date.now() + 7 * 86400000) } }
      : {}),
    ...(p.assignedToId ? { assignedToId: p.assignedToId } : {}),
  };
}

const LIST_SELECT = {
  id: true,
  businessName: true,
  dba: true,
  businessType: true,
  city: true,
  state: true,
  stage: true,
  googleRating: true,
  reviewCount: true,
  aiScore: true,
  aiVerdict: true,
  aiPriority: true,
  aiDna: true,
  aiFirstOrderEst: true,
  nextFollowupDate: true,
  lastContactDate: true,
  customerId: true,
  assignedTo: { select: { fullName: true, email: true } },
  updatedAt: true,
} satisfies Prisma.ProspectSelect;

export type ProspectListRow = {
  id: string;
  businessName: string;
  dba: string | null;
  businessType: string | null;
  city: string | null;
  state: string | null;
  stage: string;
  googleRating: number | null;
  reviewCount: number | null;
  aiScore: number | null;
  aiVerdict: string | null;
  aiPriority: string | null;
  aiDna: string[];
  aiFirstOrderEst: number | null;
  nextFollowupDate: string | null;
  lastContactDate: string | null;
  customerId: string | null;
  assignedTo: string | null;
  updatedAt: string;
};

type ListPayload = Prisma.ProspectGetPayload<{ select: typeof LIST_SELECT }>;

function toRow(x: ListPayload): ProspectListRow {
  return {
    id: x.id,
    businessName: x.businessName,
    dba: x.dba,
    businessType: x.businessType,
    city: x.city,
    state: x.state,
    stage: x.stage,
    googleRating: x.googleRating,
    reviewCount: x.reviewCount,
    aiScore: x.aiScore,
    aiVerdict: x.aiVerdict,
    aiPriority: x.aiPriority,
    aiDna: x.aiDna,
    aiFirstOrderEst: x.aiFirstOrderEst != null ? n(x.aiFirstOrderEst) : null,
    nextFollowupDate: x.nextFollowupDate?.toISOString() ?? null,
    lastContactDate: x.lastContactDate?.toISOString() ?? null,
    customerId: x.customerId,
    assignedTo: x.assignedTo?.fullName ?? x.assignedTo?.email ?? null,
    updatedAt: x.updatedAt.toISOString(),
  };
}

export async function loadProspectList(params: ProspectListParams) {
  const page = Math.max(1, params.page ?? 1);
  const sort = params.sort ?? "updatedAt";
  const dir = params.dir ?? "desc";
  const where = buildProspectWhere(params);

  const [rows, total, stageAgg, scoredAgg, followupsDue] = await Promise.all([
    prisma.prospect.findMany({
      where,
      orderBy:
        sort === "aiScore"
          ? [{ aiScore: { sort: dir, nulls: "last" } }, { updatedAt: "desc" }]
          : { [sort]: dir },
      skip: (page - 1) * PROSPECTS_PAGE_SIZE,
      take: PROSPECTS_PAGE_SIZE,
      select: LIST_SELECT,
    }),
    prisma.prospect.count({ where }),
    prisma.prospect.groupBy({
      by: ["stage"],
      _count: { _all: true },
      where: { archivedAt: null },
    }),
    prisma.prospect.aggregate({
      _count: { _all: true },
      _avg: { aiScore: true },
      where: { archivedAt: null, aiScore: { not: null } },
    }),
    prisma.prospect.count({
      where: {
        archivedAt: null,
        nextFollowupDate: { lte: new Date(Date.now() + 7 * 86400000) },
      },
    }),
  ]);

  return {
    rows: rows.map((r) => toRow(r)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PROSPECTS_PAGE_SIZE)),
    stageCounts: Object.fromEntries(
      stageAgg.map((s) => [s.stage, s._count._all]),
    ) as Record<string, number>,
    scoredCount: scoredAgg._count._all,
    avgScore: scoredAgg._avg.aiScore ?? null,
    followupsDue,
  };
}

/** Pipeline board: every non-archived prospect grouped by stage. */
export async function loadProspectBoard(params: Pick<ProspectListParams, "q" | "state" | "assignedToId">) {
  const rows = await prisma.prospect.findMany({
    where: buildProspectWhere(params),
    orderBy: [{ aiScore: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 400,
    select: LIST_SELECT,
  });
  const byStage = new Map<string, ProspectListRow[]>(
    STAGES.map((s) => [s.value, []]),
  );
  for (const r of rows) {
    byStage.get(r.stage)?.push(toRow(r));
  }
  return { byStage: Object.fromEntries(byStage) };
}
