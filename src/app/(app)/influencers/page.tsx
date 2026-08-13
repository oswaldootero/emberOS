import Link from "next/link";
import {
  Camera,
  Handshake,
  Megaphone,
  Package,
  Plus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/data-table";
import { InfluencerListClient } from "@/components/influencers/influencer-list-client";
import { requireUser } from "@/server/auth";
import {
  INFLUENCER_STAGES,
  loadInfluencerList,
  type InfluencerListParams,
} from "@/server/influencers";
import { cn } from "@/lib/utils";
import type { InfluencerStage } from "@prisma/client";

export const metadata = { title: "Influencers" };
export const dynamic = "force-dynamic";

export default async function InfluencersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    minFollowers?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const SORT_FIELDS = ["followerCount", "name", "stage", "updatedAt", "createdAt", "nextFollowupDate", "posts", "shipments"];
  const [rawSort, rawDir] = (sp.sort ?? "").split(":");
  const sortField = SORT_FIELDS.includes(rawSort ?? "")
    ? (rawSort as InfluencerListParams["sort"])
    : "updatedAt";
  const sortDir = (rawDir ?? sp.dir) === "asc" ? "asc" : "desc";

  const params: InfluencerListParams = {
    q: sp.q || undefined,
    stage: (sp.stage as InfluencerStage) || "",
    minFollowers: sp.minFollowers ? Number(sp.minFollowers) : undefined,
    sort: sortField,
    dir: sortDir,
    page: Number(sp.page) || 1,
  };

  const list = await loadInfluencerList(params);

  const baseQuery = {
    q: sp.q,
    stage: sp.stage,
    minFollowers: sp.minFollowers,
    sort: sp.sort,
    dir: sp.dir,
  };

  const activeFilters = [
    sp.stage && `stage: ${sp.stage.toLowerCase().replace(/_/g, " ")}`,
    sp.minFollowers && `followers ≥ ${sp.minFollowers}`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Influencer Relationships"
        description="Seed cigars, track what they post, grow the partners who move the needle."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/influencers/scan">
            <Camera className="h-4 w-4" /> From screenshot
          </Link>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link href="/influencers/new">
            <Plus className="h-4 w-4" /> Add influencer
          </Link>
        </Button>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Influencers" value={String(list.total)} />
        <Kpi
          icon={Package}
          label="Cigars sent"
          value={String(list.cigarsSentTotal)}
          hint={list.shipmentsTotal > 0 ? `across ${list.shipmentsTotal} shipment${list.shipmentsTotal === 1 ? "" : "s"}` : undefined}
          accent="text-ember-200"
        />
        <Kpi icon={Megaphone} label="Posts logged" value={String(list.postsTotal)} />
        <Kpi
          icon={Handshake}
          label="Active partners"
          value={String(list.stageCounts.ACTIVE_PARTNER ?? 0)}
          accent={(list.stageCounts.ACTIVE_PARTNER ?? 0) > 0 ? "text-emerald-300" : undefined}
        />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>
              Roster
              {activeFilters.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {activeFilters.join(" · ")}{" "}
                  <Link href="/influencers" className="text-ember-200 hover:underline">
                    clear
                  </Link>
                </span>
              )}
            </CardTitle>
            <form action="/influencers" className="flex items-center gap-2 flex-wrap">
              <Input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search name, handle, niche…"
                className="h-8 w-44 sm:w-52 text-xs"
              />
              <select
                name="stage"
                defaultValue={sp.stage ?? ""}
                className="h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory"
              >
                <option value="">All stages</option>
                {INFLUENCER_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <select
                name="minFollowers"
                defaultValue={sp.minFollowers ?? ""}
                className="h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory"
                title="Minimum followers"
              >
                <option value="">Any size</option>
                <option value="1000">1K+</option>
                <option value="10000">10K+</option>
                <option value="50000">50K+</option>
                <option value="100000">100K+</option>
                <option value="1000000">1M+</option>
              </select>
              <Button type="submit" variant="outline" size="sm">Apply</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {list.total === 0 && !sp.q && !sp.stage ? (
            <div className="text-center py-12 space-y-3">
              <Megaphone className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                No influencers yet. Snap a screenshot of their profile or add
                the first one by hand.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/influencers/scan"><Camera className="h-3.5 w-3.5" /> From screenshot</Link>
                </Button>
                <Button variant="gold" size="sm" asChild>
                  <Link href="/influencers/new"><Plus className="h-3.5 w-3.5" /> Add influencer</Link>
                </Button>
              </div>
            </div>
          ) : (
            <>
              <InfluencerListClient rows={list.rows} isAdmin={user.role === "ADMIN"} />
              <div className="pt-4">
                <Pagination
                  page={list.page}
                  pageCount={list.pageCount}
                  total={list.total}
                  basePath="/influencers"
                  baseQuery={baseQuery}
                  noun="influencers"
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
