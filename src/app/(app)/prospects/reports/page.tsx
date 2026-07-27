import Link from "next/link";
import { ArrowLeft, BarChart3, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IcpScoreBadge, StageBadge } from "@/components/prospects/score-badge";
import { requireUser } from "@/server/auth";
import { loadIcpReport, type IcpProspectRow } from "@/server/prospecting-reports";
import { icpTier } from "@/lib/icp";
import { cn } from "@/lib/utils";

export const metadata = { title: "ICP Reports" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);

export default async function IcpReportsPage() {
  await requireUser();
  const report = await loadIcpReport();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/prospects">
          <ArrowLeft className="h-4 w-4" /> All prospects
        </Link>
      </Button>

      <PageHeader
        eyebrow="CRM"
        title="ICP Reports"
        description="How the Ideal Customer Profile model is performing across reps, tiers, and revenue."
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={ClipboardCheck} label="ICP-scored" value={String(report.scoredCount)} />
        <Kpi
          icon={Target}
          label="Not yet scored"
          value={String(report.unscoredCount)}
          accent={report.unscoredCount > 0 ? "text-amber-300" : undefined}
        />
        <Kpi
          icon={BarChart3}
          label="Average ICP"
          value={report.avgScore != null ? String(report.avgScore) : "—"}
          accent={report.avgScore != null ? icpTier(report.avgScore).textClass : undefined}
        />
        <Kpi
          icon={TrendingUp}
          label="Converted (scored)"
          value={String(report.byTier.reduce((s, t) => s + t.converted, 0))}
        />
      </div>

      {report.scoredCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              No ICP assessments yet. Open a prospect and fill in the Ideal
              Customer Profile card — reports build themselves from there.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Performance by tier */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by ICP tier</CardTitle>
              <CardDescription>
                Conversion, win rate, revenue, and sales-cycle length per score range.
                Revenue counts non-draft invoices of converted customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
                      <th className="text-left font-normal py-2 px-2">Tier</th>
                      <th className="text-right font-normal py-2 px-2">Prospects</th>
                      <th className="text-right font-normal py-2 px-2">Converted</th>
                      <th className="text-right font-normal py-2 px-2">Lost</th>
                      <th className="text-right font-normal py-2 px-2">Conversion</th>
                      <th className="text-right font-normal py-2 px-2">Win rate</th>
                      <th className="text-right font-normal py-2 px-2">Revenue</th>
                      <th className="text-right font-normal py-2 px-2">Avg cycle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {report.byTier.map((t) => {
                      const tier = icpTier(t.min);
                      return (
                        <tr key={t.label} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <span className={cn("h-2 w-2 rounded-full shrink-0", tier.dotClass)} />
                              <span className={cn("text-xs font-medium", tier.textClass)}>{t.rating}</span>
                              <span className="text-[10px] text-muted-foreground">{t.label}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-ivory">{t.count}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-ivory">{t.converted}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">{t.lost}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-ivory">{pct(t.conversionRate)}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-ivory">{pct(t.winRate)}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-ember-200">
                            {t.revenue > 0 ? fmtUsd(t.revenue) : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-muted-foreground">
                            {t.avgCycleDays != null ? `${t.avgCycleDays}d` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Average by rep */}
            <Card>
              <CardHeader>
                <CardTitle>Average ICP score by rep</CardTitle>
                <CardDescription>Scored prospects assigned to each rep.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.byRep.map((r) => {
                  const tier = icpTier(r.avgScore);
                  return (
                    <div key={r.rep} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ivory truncate">{r.rep}</span>
                        <span className="text-muted-foreground tabular-nums">
                          <span className={tier.textClass}>{r.avgScore}</span>
                          {" avg · "}
                          {r.scored} scored · {r.converted} converted
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", tier.dotClass)}
                          style={{ width: `${r.avgScore}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Highest / lowest */}
            <div className="space-y-6">
              <ProspectRankCard title="Highest scoring prospects" rows={report.highest} />
              <ProspectRankCard title="Lowest scoring prospects" rows={report.lowest} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProspectRankCard({ title, rows }: { title: string; rows: IcpProspectRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-white/[0.04]">
        {rows.map((p) => (
          <div key={p.id} className="py-2 flex items-center gap-3">
            <IcpScoreBadge score={p.icpScore} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/prospects/${p.id}`}
                className="text-xs text-ivory hover:text-ember-200 truncate block"
              >
                {p.businessName}
              </Link>
              <div className="text-[10px] text-muted-foreground truncate">
                {[[p.city, p.state].filter(Boolean).join(", "), p.rep]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
            </div>
            <div className="hidden sm:block shrink-0">
              <StageBadge stage={p.stage} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={cn("h-4 w-4", accent ?? "text-ember-300/80")} />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <div className={cn("font-display text-3xl tracking-tight tabular-nums", accent ?? "text-ivory")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
