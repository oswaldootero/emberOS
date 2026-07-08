import Link from "next/link";
import {
  CalendarClock,
  Columns3,
  List,
  Plus,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, buildQuery } from "@/components/ui/data-table";
import { ProspectListClient } from "@/components/prospects/prospect-list-client";
import { ProspectBoard } from "@/components/prospects/prospect-board";
import { AiSearchBox } from "@/components/prospects/ai-search-box";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import {
  STAGES,
  loadProspectBoard,
  loadProspectList,
  type ProspectListParams,
} from "@/server/prospecting";
import { cn } from "@/lib/utils";
import type { ProspectStage, ProspectVerdict } from "@prisma/client";

export const metadata = { title: "Prospecting" };
export const dynamic = "force-dynamic";
// AI actions (analysis ~10s each, batches up to 5) need a longer budget
export const maxDuration = 60;

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    state?: string;
    city?: string;
    minScore?: string;
    verdict?: string;
    dna?: string;
    followup?: string;
    sort?: string;
    dir?: string;
    page?: string;
    view?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const view = sp.view === "board" ? "board" : "list";

  const params: ProspectListParams = {
    q: sp.q || undefined,
    stage: (sp.stage as ProspectStage) || "",
    state: sp.state || undefined,
    city: sp.city || undefined,
    minScore: sp.minScore ? Number(sp.minScore) : undefined,
    verdict: (sp.verdict as ProspectVerdict) || "",
    dna: sp.dna ? sp.dna.split(",").filter(Boolean) : undefined,
    needsFollowUp: sp.followup === "1",
    sort: (sp.sort as ProspectListParams["sort"]) ?? "updatedAt",
    dir: sp.dir === "asc" ? "asc" : "desc",
    page: Number(sp.page) || 1,
  };

  const [list, board, unanalyzedCount] = await Promise.all([
    loadProspectList(params),
    view === "board"
      ? loadProspectBoard({ q: params.q, state: params.state })
      : Promise.resolve(null),
    prisma.prospect.count({ where: { archivedAt: null, aiAnalyzedAt: null } }),
  ]);

  const baseQuery = {
    q: sp.q,
    stage: sp.stage,
    state: sp.state,
    city: sp.city,
    minScore: sp.minScore,
    verdict: sp.verdict,
    dna: sp.dna,
    followup: sp.followup,
    sort: sp.sort,
    dir: sp.dir,
    view: sp.view,
  };

  const activeFilters = [
    sp.stage && `stage: ${sp.stage.toLowerCase()}`,
    sp.state && `state: ${sp.state}`,
    sp.minScore && `score ≥ ${sp.minScore}`,
    sp.verdict && `verdict: ${sp.verdict.toLowerCase()}`,
    sp.dna && `DNA: ${sp.dna}`,
    sp.followup === "1" && "needs follow-up",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Prospecting"
        description="Find, score, and win the next Heaven's Leaf accounts — AI does the homework."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/prospects/import">
            <Upload className="h-4 w-4" /> Import CSV
          </Link>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link href="/prospects/new">
            <Plus className="h-4 w-4" /> Add prospect
          </Link>
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Target} label="Prospects" value={String(list.total)} />
        <Kpi
          icon={Sparkles}
          label="AI-scored"
          value={String(list.scoredCount)}
          hint={list.avgScore != null ? `avg score ${Math.round(list.avgScore)}` : undefined}
          accent="text-ember-200"
        />
        <Kpi
          icon={Columns3}
          label="In negotiation+"
          value={String(
            (list.stageCounts.NEGOTIATION ?? 0) +
              (list.stageCounts.FIRST_ORDER ?? 0) +
              (list.stageCounts.SAMPLES_DELIVERED ?? 0),
          )}
        />
        <Kpi
          icon={CalendarClock}
          label="Follow-ups due"
          value={String(list.followupsDue)}
          accent={list.followupsDue > 0 ? "text-amber-300" : undefined}
        />
      </div>

      {/* AI search */}
      <AiSearchBox />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>
              Pipeline
              {activeFilters.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {activeFilters.join(" · ")}{" "}
                  <Link href="/prospects" className="text-ember-200 hover:underline">
                    clear
                  </Link>
                </span>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <form action="/prospects" className="flex items-center gap-2">
                {sp.view && <input type="hidden" name="view" value={sp.view} />}
                <Input
                  name="q"
                  defaultValue={sp.q ?? ""}
                  placeholder="Search prospects…"
                  className="h-8 w-48 text-xs"
                />
                <select
                  name="stage"
                  defaultValue={sp.stage ?? ""}
                  className="h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory"
                >
                  <option value="">All stages</option>
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">Apply</Button>
              </form>
              <div className="flex rounded-md border border-white/10 overflow-hidden">
                <Link
                  href={`/prospects${buildQuery(baseQuery, { view: undefined, page: 1 })}`}
                  className={cn(
                    "px-2.5 py-1.5 text-xs flex items-center gap-1",
                    view === "list" ? "bg-ember-500/15 text-ivory" : "text-muted-foreground hover:text-ivory",
                  )}
                >
                  <List className="h-3.5 w-3.5" /> List
                </Link>
                <Link
                  href={`/prospects${buildQuery(baseQuery, { view: "board", page: 1 })}`}
                  className={cn(
                    "px-2.5 py-1.5 text-xs flex items-center gap-1",
                    view === "board" ? "bg-ember-500/15 text-ivory" : "text-muted-foreground hover:text-ivory",
                  )}
                >
                  <Columns3 className="h-3.5 w-3.5" /> Board
                </Link>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {list.total === 0 && !sp.q && !sp.stage ? (
            <div className="text-center py-12 space-y-3">
              <Target className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                No prospects yet. Import a list or add the first one — then let
                AI score them.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/prospects/import"><Upload className="h-3.5 w-3.5" /> Import CSV</Link>
                </Button>
                <Button variant="gold" size="sm" asChild>
                  <Link href="/prospects/new"><Plus className="h-3.5 w-3.5" /> Add prospect</Link>
                </Button>
              </div>
            </div>
          ) : view === "board" && board ? (
            <ProspectBoard byStage={board.byStage} />
          ) : (
            <>
              <ProspectListClient
                rows={list.rows}
                isAdmin={user.role === "ADMIN"}
                unanalyzedCount={unanalyzedCount}
              />
              <div className="pt-4">
                <Pagination
                  page={list.page}
                  pageCount={list.pageCount}
                  total={list.total}
                  basePath="/prospects"
                  baseQuery={baseQuery}
                  noun="prospects"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
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
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
