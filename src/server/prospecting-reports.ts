import "server-only";
import { prisma } from "@/lib/prisma";
import { n } from "@/server/sales";
import { ICP_RANGES } from "@/lib/icp";

export type IcpRepRow = {
  rep: string;
  scored: number;
  avgScore: number;
  converted: number;
};

export type IcpTierRow = {
  label: string;
  rating: string;
  min: number;
  count: number;
  converted: number;
  lost: number;
  conversionRate: number | null; // converted / count
  winRate: number | null; // converted / (converted + lost)
  revenue: number; // paid + billed sales of converted customers
  avgCycleDays: number | null; // prospect created → customer created
};

export type IcpProspectRow = {
  id: string;
  businessName: string;
  city: string | null;
  state: string | null;
  icpScore: number;
  stage: string;
  rep: string | null;
};

export type IcpReport = {
  scoredCount: number;
  unscoredCount: number;
  avgScore: number | null;
  byRep: IcpRepRow[];
  byTier: IcpTierRow[];
  highest: IcpProspectRow[];
  lowest: IcpProspectRow[];
};

export async function loadIcpReport(): Promise<IcpReport> {
  const [scored, unscoredCount] = await Promise.all([
    prisma.prospect.findMany({
      where: { archivedAt: null, icpScore: { not: null } },
      select: {
        id: true,
        businessName: true,
        city: true,
        state: true,
        icpScore: true,
        stage: true,
        customerId: true,
        createdAt: true,
        assignedTo: { select: { fullName: true, email: true } },
        customer: { select: { createdAt: true } },
      },
    }),
    prisma.prospect.count({ where: { archivedAt: null, icpScore: null } }),
  ]);

  // Revenue for converted prospects, keyed by customer
  const customerIds = scored.map((p) => p.customerId).filter((x): x is string => Boolean(x));
  const revenueByCustomer = new Map<string, number>();
  if (customerIds.length > 0) {
    const sales = await prisma.sale.groupBy({
      by: ["customerId"],
      _sum: { grandTotal: true },
      where: {
        customerId: { in: customerIds },
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
    });
    for (const s of sales) {
      revenueByCustomer.set(s.customerId, s._sum.grandTotal != null ? n(s._sum.grandTotal) : 0);
    }
  }

  // ── By rep ──
  const repMap = new Map<string, { scored: number; sum: number; converted: number }>();
  for (const p of scored) {
    const rep = p.assignedTo?.fullName ?? p.assignedTo?.email ?? "Unassigned";
    const r = repMap.get(rep) ?? { scored: 0, sum: 0, converted: 0 };
    r.scored++;
    r.sum += p.icpScore!;
    if (p.customerId) r.converted++;
    repMap.set(rep, r);
  }
  const byRep: IcpRepRow[] = Array.from(repMap.entries())
    .map(([rep, r]) => ({
      rep,
      scored: r.scored,
      avgScore: Math.round(r.sum / r.scored),
      converted: r.converted,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  // ── By tier ──
  const byTier: IcpTierRow[] = ICP_RANGES.map((range) => {
    const inRange = scored.filter((p) => p.icpScore! >= range.min && p.icpScore! <= range.max);
    const converted = inRange.filter((p) => p.customerId);
    const lost = inRange.filter((p) => p.stage === "LOST");
    const revenue = converted.reduce(
      (sum, p) => sum + (revenueByCustomer.get(p.customerId!) ?? 0),
      0,
    );
    const cycles = converted
      .filter((p) => p.customer)
      .map((p) => (p.customer!.createdAt.getTime() - p.createdAt.getTime()) / 86400000)
      .filter((d) => d >= 0);
    const decided = converted.length + lost.length;
    return {
      label: range.label,
      rating: range.rating,
      min: range.min,
      count: inRange.length,
      converted: converted.length,
      lost: lost.length,
      conversionRate: inRange.length > 0 ? converted.length / inRange.length : null,
      winRate: decided > 0 ? converted.length / decided : null,
      revenue,
      avgCycleDays:
        cycles.length > 0
          ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)
          : null,
    };
  });

  const toRow = (p: (typeof scored)[number]): IcpProspectRow => ({
    id: p.id,
    businessName: p.businessName,
    city: p.city,
    state: p.state,
    icpScore: p.icpScore!,
    stage: p.stage,
    rep: p.assignedTo?.fullName ?? p.assignedTo?.email ?? null,
  });
  const sorted = [...scored].sort((a, b) => b.icpScore! - a.icpScore!);

  return {
    scoredCount: scored.length,
    unscoredCount,
    avgScore:
      scored.length > 0
        ? Math.round(scored.reduce((s, p) => s + p.icpScore!, 0) / scored.length)
        : null,
    byRep,
    byTier,
    highest: sorted.slice(0, 10).map(toRow),
    lowest: sorted.slice(-10).reverse().map(toRow),
  };
}
