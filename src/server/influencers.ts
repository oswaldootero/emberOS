import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, InfluencerStage } from "@prisma/client";

export const INFLUENCERS_PAGE_SIZE = 25;

export const INFLUENCER_STAGES: { value: InfluencerStage; label: string }[] = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "IN_CONVERSATION", label: "In conversation" },
  { value: "AGREED", label: "Agreed" },
  { value: "CIGARS_SENT", label: "Cigars sent" },
  { value: "ACTIVE_PARTNER", label: "Active partner" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DECLINED", label: "Declined" },
];

export type InfluencerListParams = {
  q?: string;
  stage?: InfluencerStage | "";
  platform?: string;
  niche?: string;
  minFollowers?: number;
  assignedToId?: string;
  archived?: boolean;
  sort?:
    | "followerCount"
    | "name"
    | "stage"
    | "updatedAt"
    | "createdAt"
    | "nextFollowupDate"
    | "posts"
    | "shipments";
  dir?: "asc" | "desc";
  page?: number;
};

export function buildInfluencerWhere(p: InfluencerListParams): Prisma.InfluencerWhereInput {
  return {
    archivedAt: p.archived ? { not: null } : null,
    ...(p.q
      ? {
          OR: [
            { name: { contains: p.q, mode: "insensitive" } },
            { handle: { contains: p.q, mode: "insensitive" } },
            { niche: { contains: p.q, mode: "insensitive" } },
            { location: { contains: p.q, mode: "insensitive" } },
            { tags: { has: p.q } },
          ],
        }
      : {}),
    ...(p.stage ? { stage: p.stage } : {}),
    ...(p.platform ? { platform: { equals: p.platform, mode: "insensitive" } } : {}),
    ...(p.niche ? { niche: { contains: p.niche, mode: "insensitive" } } : {}),
    ...(p.minFollowers != null ? { followerCount: { gte: p.minFollowers } } : {}),
    ...(p.assignedToId ? { assignedToId: p.assignedToId } : {}),
  };
}

const LIST_SELECT = {
  id: true,
  name: true,
  handle: true,
  platform: true,
  followerCount: true,
  niche: true,
  location: true,
  stage: true,
  nextFollowupDate: true,
  updatedAt: true,
  shipments: { select: { cigarCount: true } },
  posts: {
    select: { postedAt: true },
    orderBy: { postedAt: "desc" },
    take: 1,
  },
  _count: { select: { shipments: true, posts: true } },
} satisfies Prisma.InfluencerSelect;

export type InfluencerListRow = {
  id: string;
  name: string;
  handle: string | null;
  platform: string;
  followerCount: number | null;
  niche: string | null;
  location: string | null;
  stage: string;
  nextFollowupDate: string | null;
  updatedAt: string;
  shipmentCount: number;
  cigarsSent: number;
  postCount: number;
  lastPostAt: string | null;
};

type ListPayload = Prisma.InfluencerGetPayload<{ select: typeof LIST_SELECT }>;

function toRow(x: ListPayload): InfluencerListRow {
  return {
    id: x.id,
    name: x.name,
    handle: x.handle,
    platform: x.platform,
    followerCount: x.followerCount,
    niche: x.niche,
    location: x.location,
    stage: x.stage,
    nextFollowupDate: x.nextFollowupDate?.toISOString() ?? null,
    updatedAt: x.updatedAt.toISOString(),
    shipmentCount: x._count.shipments,
    cigarsSent: x.shipments.reduce((s, sh) => s + sh.cigarCount, 0),
    postCount: x._count.posts,
    lastPostAt: x.posts[0]?.postedAt.toISOString() ?? null,
  };
}

export async function loadInfluencerList(params: InfluencerListParams) {
  const page = Math.max(1, params.page ?? 1);
  const sort = params.sort ?? "updatedAt";
  const dir = params.dir ?? "desc";
  const where = buildInfluencerWhere(params);

  const [rows, total, stageAgg, cigarAgg, postCount] = await Promise.all([
    prisma.influencer.findMany({
      where,
      orderBy:
        sort === "posts"
          ? [{ posts: { _count: dir } }, { updatedAt: "desc" }]
          : sort === "shipments"
            ? [{ shipments: { _count: dir } }, { updatedAt: "desc" }]
            : ["followerCount", "nextFollowupDate"].includes(sort)
              ? [{ [sort]: { sort: dir, nulls: "last" } }, { updatedAt: "desc" }]
              : { [sort]: dir },
      skip: (page - 1) * INFLUENCERS_PAGE_SIZE,
      take: INFLUENCERS_PAGE_SIZE,
      select: LIST_SELECT,
    }),
    prisma.influencer.count({ where }),
    prisma.influencer.groupBy({
      by: ["stage"],
      _count: { _all: true },
      where: { archivedAt: null },
    }),
    prisma.influencerShipment.aggregate({
      _sum: { cigarCount: true },
      _count: { _all: true },
      where: { influencer: { archivedAt: null } },
    }),
    prisma.influencerPost.count({
      where: { influencer: { archivedAt: null } },
    }),
  ]);

  return {
    rows: rows.map((r) => toRow(r)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / INFLUENCERS_PAGE_SIZE)),
    stageCounts: Object.fromEntries(
      stageAgg.map((s) => [s.stage, s._count._all]),
    ) as Record<string, number>,
    cigarsSentTotal: cigarAgg._sum.cigarCount ?? 0,
    shipmentsTotal: cigarAgg._count._all,
    postsTotal: postCount,
  };
}
