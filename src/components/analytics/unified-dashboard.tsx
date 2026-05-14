"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  ExternalLink,
  Eye,
  Flame,
  Heart,
  MousePointerClick,
  Search,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
  Wand2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelReachBars, ReachOverlayChart } from "./charts";
import { cn, compactNumber, relativeTime } from "@/lib/utils";
import { setStudioHandoff } from "@/lib/handoff";
import type {
  UnifiedDashboard as UnifiedDashboardData,
} from "@/server/analytics/dashboard";

const SOURCE_BADGE: Record<string, { label: string; tone: string }> = {
  INSTAGRAM: { label: "IG", tone: "text-ember-200 bg-ember-500/15" },
  FACEBOOK: { label: "FB", tone: "text-tobacco-200 bg-tobacco-500/15" },
  GA4: { label: "Web", tone: "text-ivory bg-ink-700" },
  GSC: { label: "Search", tone: "text-ember-200 bg-ember-500/15" },
  YOUTUBE: { label: "YT", tone: "text-tobacco-200 bg-tobacco-500/15" },
};

export function UnifiedDashboard({
  data,
}: {
  data: UnifiedDashboardData;
}) {
  if (!data.hasData) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-3">
          <UploadCloud className="h-7 w-7 text-ember-300 mx-auto opacity-60" />
          <div className="text-sm text-ivory">
            Your unified dashboard is empty.
          </div>
          <div className="text-xs text-muted-foreground max-w-md mx-auto">
            Upload at least one CSV from Google Analytics, Search Console, or
            Meta Business Suite. The more sources you feed in, the more useful
            this view becomes.
          </div>
          <Button variant="gold" size="sm" asChild>
            <Link href="/analytics/import">
              <UploadCloud className="h-4 w-4" /> Import First CSV
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Highlight line */}
      {data.highlight && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-ember-glow opacity-50 pointer-events-none" />
          <CardContent className="relative p-5 flex items-start gap-3">
            <Flame className="h-5 w-5 text-ember-300 shrink-0 mt-0.5" />
            <div className="text-sm text-ivory leading-relaxed">
              {data.highlight}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cross-platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Total reach"
          value={data.audienceReach}
          hint="IG + FB + Web visitors"
          icon={Eye}
        />
        <Kpi
          label="Engagement"
          value={data.engagement}
          hint="Reactions + comments + shares + saves"
          icon={Heart}
        />
        <Kpi
          label="Search impressions"
          value={data.searchImpressions}
          hint={`${data.searchClicks.toLocaleString()} clicks · ${(data.searchCtr * 100).toFixed(2)}% CTR`}
          icon={Search}
        />
        <Kpi
          label="Posts measured"
          value={data.totalPosts}
          hint="Across IG + FB"
          icon={Sparkles}
        />
      </div>

      {/* Trend overlay + Channel comparison */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-ember-300" />
              {trendChartTitle(data.reachTrendSource)}
            </CardTitle>
            <CardDescription>
              {trendChartDescription(data.reachTrendSource, data.reachTrend.length > 0)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.reachTrend.length > 0 ? (
              <>
                <ReachOverlayChart data={data.reachTrend} />
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2">
                  <LegendDot color="#e3b04f" label="Instagram" />
                  <LegendDot color="#a8845a" label="Facebook" />
                </div>
              </>
            ) : (
              <EmptyChart label="No Meta Content imports yet — upload one to fill this in." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ember-300" />
              Channel comparison
            </CardTitle>
            <CardDescription>Total reach per channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChannelReachBars
              data={data.channels
                .filter((c) => c.hasData)
                .map((c) => ({
                  label: c.label,
                  reach: c.reach,
                  engagement: c.engagement,
                }))}
            />
            <div className="grid grid-cols-2 gap-2 mt-3">
              {data.channels
                .filter((c) => c.hasData)
                .map((c) => (
                  <div
                    key={c.source}
                    className="text-[10px] flex items-center justify-between rounded border border-white/[0.04] bg-ink-900/40 px-2 py-1.5"
                  >
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="text-ivory tabular-nums">
                      {compactNumber(c.primaryMetric.value)} {c.primaryMetric.label}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cross-platform top performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-ember-300" />
            What's resonating with your community
          </CardTitle>
          <CardDescription>
            These pieces earned the most attention this period. Each one
            carries something worth amplifying — tap{" "}
            <span className="text-ember-200 font-medium">Riff on this</span>{" "}
            to bring it into the Studio and write more in its spirit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topPerformers.map((p, i) => (
              <TopPerformerCard key={`${p.source}-${i}`} performer={p} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Freshness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-ember-300" />
            Data freshness
          </CardTitle>
          <CardDescription>
            When each source was last fed into EmberOS. Stale data = stale
            decisions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.freshness.map((f) => (
              <FreshnessCard key={f.source} freshness={f} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TopPerformerCard({
  performer,
}: {
  performer: import("@/server/analytics/dashboard").TopPerformer;
}) {
  const router = useRouter();

  function riff() {
    setStudioHandoff({
      inspiration: performer.label,
      sourceLabel: `${sourceLabel(performer.source)} · ${compactNumber(performer.primaryMetric)} ${performer.primaryMetricLabel}`,
      suggestedType: suggestedContentType(performer),
    });
    router.push("/studio");
  }

  const sentence = conversationalLine(performer);

  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-4 hover:border-ember-500/30 transition group">
      <div className="flex items-start gap-3">
        <SourceBadge source={performer.source} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-ivory leading-relaxed">{sentence}</p>
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="gold"
              size="sm"
              onClick={riff}
              className="h-7 text-[11px]"
            >
              <Wand2 className="h-3 w-3" /> Riff on this in Studio
            </Button>
            {performer.url && (
              <Button variant="outline" size="sm" asChild className="h-7 text-[11px]">
                <a
                  href={normalizeUrl(performer.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" /> Open original
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function sourceLabel(source: string): string {
  return (
    {
      INSTAGRAM: "Top Instagram post",
      FACEBOOK: "Top Facebook post",
      GSC: "Top search query",
      GA4: "Top page",
    }[source] ?? "Top performer"
  );
}

/**
 * Map a top performer back to a Content Studio content type so the
 * "Riff on this" handoff lands on something the Studio can actually generate.
 */
function suggestedContentType(
  performer: import("@/server/analytics/dashboard").TopPerformer,
): string {
  if (performer.type === "post") return "caption";
  if (performer.type === "query") return "seo_article";
  if (performer.type === "page") return "blog_post";
  if (performer.type === "video") return "video_hook";
  return "caption";
}

/**
 * Translate a numeric ranking row into something a brand operator would
 * actually read out loud. Keeps the "human concierge" voice instead of
 * dashboard-speak.
 */
function conversationalLine(
  p: import("@/server/analytics/dashboard").TopPerformer,
): string {
  const metric = `${compactNumber(p.primaryMetric)} ${p.primaryMetricLabel}`;
  const secondary =
    p.secondaryMetric !== null
      ? ` (${compactNumber(p.secondaryMetric)} ${p.secondaryMetricLabel})`
      : "";
  const label = p.label.length > 110 ? p.label.slice(0, 107) + "…" : p.label;

  switch (p.source) {
    case "INSTAGRAM":
      return p.type === "post"
        ? `On Instagram, "${label}" earned ${metric}${secondary} — your community leaned in.`
        : `"${label}" pulled ${metric}${secondary} on Instagram.`;
    case "FACEBOOK":
      return p.type === "post"
        ? `Over on Facebook, "${label}" landed ${metric}${secondary}.`
        : `"${label}" earned ${metric}${secondary} on Facebook.`;
    case "GSC":
      if (p.type === "query") {
        return `People are finding you through "${label}" — ${metric}${secondary} from Google search.`;
      }
      return `The page "${label}" pulled ${metric}${secondary} from search.`;
    case "GA4":
      return `On the site, "${label}" drew ${metric}${secondary}.`;
    default:
      return `"${label}" — ${metric}${secondary}.`;
  }
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4 text-ember-300/80" />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <div className="font-display text-3xl md:text-4xl tracking-tight text-ivory tabular-nums">
          {compactNumber(value)}
        </div>
        {hint && (
          <div className="text-[10px] text-muted-foreground leading-tight">
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_BADGE[source] ?? {
    label: source.slice(0, 3),
    tone: "bg-white/5 text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider font-medium",
        cfg.tone,
      )}
    >
      {cfg.label}
    </span>
  );
}

function FreshnessCard({
  freshness,
}: {
  freshness: { source: string; label: string; lastImportedAt: string | null; staleDays: number | null };
}) {
  if (!freshness.lastImportedAt) {
    return (
      <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{freshness.label}</span>
        </div>
        <div className="text-[10px] text-muted-foreground italic">
          No imports yet
        </div>
      </div>
    );
  }

  const stale = (freshness.staleDays ?? 0) > 14;
  const fresh = (freshness.staleDays ?? 0) <= 7;
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3 space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {fresh ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : stale ? (
            <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-ember-300/80" />
          )}
          <span className="text-ivory">{freshness.label}</span>
        </div>
        <Badge
          variant={fresh ? "success" : stale ? "warning" : "outline"}
          className="text-[9px]"
        >
          {freshness.staleDays === 0
            ? "today"
            : `${freshness.staleDays}d ago`}
        </Badge>
      </div>
      <div className="text-[10px] text-muted-foreground">
        Imported {relativeTime(freshness.lastImportedAt)}
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-3 h-0.5"
        style={{
          background: color,
          borderTop: dashed ? `1px dashed ${color}` : undefined,
          borderBottom: dashed ? `1px dashed ${color}` : undefined,
          height: dashed ? 0 : 2,
        }}
      />
      {label}
    </span>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground italic">
      {label}
    </div>
  );
}

function trendChartTitle(
  source: "overview" | "content" | "mixed" | "none",
): string {
  switch (source) {
    case "overview":
      return "Daily account reach";
    case "content":
      return "Daily reach from published posts";
    case "mixed":
      return "Daily reach (mixed sources)";
    default:
      return "Daily reach";
  }
}

function trendChartDescription(
  source: "overview" | "content" | "mixed" | "none",
  hasData: boolean,
): string {
  if (!hasData) {
    return "Upload an Instagram or Facebook Content insights CSV to fill this chart.";
  }
  if (source === "content") {
    return "Sum of post reach by publish date — shows when your content lands hardest.";
  }
  if (source === "overview") {
    return "Account-level daily reach pulled from your Meta Insights overview.";
  }
  return "Daily reach across Meta channels.";
}

function normalizeUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/"))
    return `${process.env.NEXT_PUBLIC_WORDPRESS_URL ?? "https://heavensleaf.com"}${url}`;
  return url;
}
