import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  Coins,
  Database,
  Eye,
  FileText,
  Globe,
  MousePointerClick,
  Search,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AICostLine,
  AIUsageTimeseries,
  AudienceTimeseries,
  ContentTypePie,
  PlatformStackedBars,
  SearchPerformanceTimeseries,
  TelegramTimeseries,
} from "@/components/analytics/charts";
import { cn, compactNumber, relativeTime } from "@/lib/utils";
import { getInternalAnalytics, type AnalyticsRange } from "@/server/analytics";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const RANGES: { label: string; value: AnalyticsRange }[] = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = ([7, 30, 90].includes(Number(params.range))
    ? Number(params.range)
    : 30) as AnalyticsRange;

  const a = await getInternalAnalytics(range);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="What's resonating, and why."
        description="Live metrics across AI usage, content, scheduling, WordPress, and the Telegram brotherhood."
      >
        <RangeSwitcher current={range} />
      </PageHeader>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Content created"
          value={a.kpis.contentCreated.value}
          delta={a.kpis.contentCreated.deltaPct}
          icon={FileText}
          hint={`${a.range}-day window`}
        />
        <KpiCard
          label="AI generations"
          value={a.kpis.aiGenerations.value}
          delta={a.kpis.aiGenerations.deltaPct}
          icon={Sparkles}
          hint={`${compactNumber(a.aiUsage.totalTokens)} tokens`}
        />
        <KpiCard
          label="Posts scheduled"
          value={a.kpis.scheduledPosts.value}
          delta={a.kpis.scheduledPosts.deltaPct}
          icon={CalendarClock}
        />
        <KpiCard
          label="AI spend"
          value={`$${a.kpis.aiSpendUsd.value.toFixed(2)}`}
          delta={a.kpis.aiSpendUsd.deltaPct}
          icon={Coins}
          hint="across all models"
        />
      </div>

      {/* Audience (GA4) */}
      <AudiencePanel ga4={a.ga4} range={range} />

      {/* Search performance (GSC) */}
      <SearchPanel gsc={a.gsc} />

      {/* AI usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ember-300" />
              AI Usage
            </CardTitle>
            <CardDescription>
              Jobs, tokens, and spend over the last {a.range} days.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px]">
            <Database className="h-3 w-3 mr-1" /> internal db
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Generations per day
              </div>
              <AIUsageTimeseries data={a.aiUsage.timeseries} />
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-4 mb-2">
                Spend per day
              </div>
              <AICostLine data={a.aiUsage.timeseries} />
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Top users
                </div>
                {a.aiUsage.topUsers.length === 0 ? (
                  <EmptyHint label="No AI jobs in window." />
                ) : (
                  <ul className="space-y-2">
                    {a.aiUsage.topUsers.map((u, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 py-1.5 text-sm border-b border-white/[0.04] last:border-0"
                      >
                        <span className="w-5 text-xs text-muted-foreground font-mono">
                          {i + 1}.
                        </span>
                        <span className="flex-1 text-ivory truncate">{u.name}</span>
                        <span className="text-muted-foreground tabular-nums text-xs">
                          {u.jobs} runs
                        </span>
                        <Badge variant="gold" className="text-[10px] tabular-nums">
                          ${u.costUsd.toFixed(2)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  By content type
                </div>
                <ContentTypePie
                  data={a.aiUsage.byContentType.map((t) => ({
                    name: prettyType(t.type),
                    value: t.count,
                  }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content + Scheduling */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ember-300" />
              Content Library
            </CardTitle>
            <CardDescription>
              Distribution across the brand's entire catalog.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {a.content.byStatus.length === 0 ? (
                <EmptyHint label="No content yet." />
              ) : (
                a.content.byStatus.map((s) => (
                  <StatusPill
                    key={s.status}
                    label={prettyStatus(s.status)}
                    value={s.count}
                  />
                ))
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Recent additions
              </div>
              {a.content.recent.length === 0 ? (
                <EmptyHint label="Nothing yet." />
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {a.content.recent.map((c) => (
                    <li key={c.id} className="py-2 flex items-center gap-3 text-sm">
                      <span className="flex-1 truncate text-ivory">{c.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {prettyType(c.type)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {prettyStatus(c.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-ember-300" />
                Scheduling
              </CardTitle>
              <CardDescription>
                Posts queued, published, or failed by platform.
              </CardDescription>
            </div>
            <Badge variant="success" className="text-[10px]">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {(a.scheduling.successRate * 100).toFixed(0)}% success
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {a.scheduling.byPlatform.length === 0 ? (
              <EmptyHint label="No scheduled posts in window." />
            ) : (
              <PlatformStackedBars data={a.scheduling.byPlatform} />
            )}

            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Up next
              </div>
              {a.scheduling.upcoming.length === 0 ? (
                <EmptyHint label="Nothing in the queue." />
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {a.scheduling.upcoming.map((p) => (
                    <li key={p.id} className="py-2 flex items-center gap-3 text-sm">
                      <span className="flex-1 truncate text-ivory">{p.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {p.platform.toLowerCase()}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(p.scheduledFor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WordPress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-ember-300" />
              WordPress
            </CardTitle>
            <CardDescription>
              {a.wordpress.connected
                ? "Live counts pulled from your WordPress site."
                : "Not connected. Wire WORDPRESS_* env vars to light this up."}
            </CardDescription>
          </div>
          {a.wordpress.connected && a.wordpress.stats && (
            <Badge variant="success" className="text-[10px]">
              {a.wordpress.stats.total.toLocaleString()} posts
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {!a.wordpress.connected ? (
            <EmptyHint label="Configure WordPress credentials to see live counts and recent activity here." />
          ) : (
            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
              <div className="grid grid-cols-4 gap-3">
                <StatusPill label="Published" value={a.wordpress.stats?.publish ?? 0} />
                <StatusPill label="Scheduled" value={a.wordpress.stats?.future ?? 0} />
                <StatusPill label="Drafts" value={a.wordpress.stats?.draft ?? 0} />
                <StatusPill label="Pending" value={a.wordpress.stats?.pending ?? 0} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Most recent
                </div>
                <ul className="divide-y divide-white/[0.04]">
                  {(a.wordpress.recent ?? []).map((p) => (
                    <li
                      key={p.id}
                      className="py-2 flex items-center gap-3 text-sm"
                    >
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-ivory hover:text-ember-200"
                      >
                        {p.title}
                      </a>
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(p.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-ember-300" />
              Brotherhood (Telegram)
            </CardTitle>
            <CardDescription>
              {a.telegram.members > 0
                ? "Activity in the brotherhood channel."
                : "Connect the Telegram bot to start tracking activity here."}
            </CardDescription>
          </div>
          {a.telegram.members > 0 && (
            <Badge variant="outline" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              {a.telegram.members} members · {a.telegram.activeMembers7d} active 7d
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {a.telegram.members === 0 && a.telegram.messages === 0 ? (
            <EmptyHint label="No Telegram data yet. Set TELEGRAM_BOT_TOKEN + register the webhook." />
          ) : (
            <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
              <TelegramTimeseries data={a.telegram.timeseries} />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Top contributors
                </div>
                <ul className="space-y-2">
                  {a.telegram.topContributors.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 py-1 text-sm"
                    >
                      <span className="w-5 text-xs text-muted-foreground font-mono">
                        {i + 1}.
                      </span>
                      <span className="flex-1 text-ivory truncate">{c.name}</span>
                      <Badge variant="gold" className="text-[10px] tabular-nums">
                        {c.score.toFixed(1)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-ink-900/40 border-dashed">
        <CardContent className="p-5 flex items-center gap-3 text-xs text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-ember-300/70 shrink-0" />
          <span>
            Connect <strong className="text-ivory">Google Analytics 4</strong> +{" "}
            <strong className="text-ivory">Google Search Console</strong> for
            audience + SEO data. See{" "}
            <Link href="/settings" className="text-ember-300 underline">
              Settings
            </Link>{" "}
            for status.
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

function RangeSwitcher({ current }: { current: AnalyticsRange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-white/[0.05] bg-ink-900/60 p-0.5">
      {RANGES.map((r) => (
        <Link
          key={r.value}
          href={`/analytics?range=${r.value}`}
          className={cn(
            "px-3 py-1 text-xs rounded transition",
            current === r.value
              ? "bg-ember-500/15 text-ember-200"
              : "text-muted-foreground hover:text-ivory",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}) {
  const display =
    typeof value === "number" ? compactNumber(value) : value;
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4 text-ember-300/80" />
            <span className="text-[10px] uppercase tracking-wider">{label}</span>
          </div>
          {delta !== null && (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5",
                delta >= 0
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300",
              )}
            >
              {delta >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="font-display text-3xl md:text-4xl tracking-tight text-ivory tabular-nums">
          {display}
        </div>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-2xl text-ivory tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="text-xs text-muted-foreground italic py-4 text-center">
      {label}
    </div>
  );
}

function AudiencePanel({
  ga4,
  range,
}: {
  ga4: import("@/server/analytics").AnalyticsSnapshot["ga4"];
  range: number;
}) {
  if (!ga4.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ember-300" />
            Audience · Google Analytics 4
          </CardTitle>
          <CardDescription>
            Visitors to heavensleaf.com. Connect GA4 to light this up.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {ga4.reason ? (
            <p>
              Couldn't reach GA4: <code className="text-amber-300">{ga4.reason}</code>
            </p>
          ) : (
            <p>
              Set <code className="text-ember-200">GOOGLE_CLIENT_EMAIL</code>,{" "}
              <code className="text-ember-200">GOOGLE_PRIVATE_KEY</code>, and{" "}
              <code className="text-ember-200">GA4_PROPERTY_ID</code> in Vercel,
              then grant the service account Viewer access on your GA4 property.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
  const t = ga4.totals;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ember-300" />
            Audience · Google Analytics 4
          </CardTitle>
          <CardDescription>
            Visitors to heavensleaf.com over the last {range} days.
          </CardDescription>
        </div>
        <Badge variant="success" className="text-[10px]">
          live · GA4
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatusPill label="Visitors" value={t.activeUsers} />
          <StatusPill label="New" value={t.newUsers} />
          <StatusPill label="Sessions" value={t.sessions} />
          <StatusPill label="Page views" value={t.pageViews} />
        </div>
        <AudienceTimeseries data={ga4.timeseries} />
        <div className="grid lg:grid-cols-3 gap-6">
          <div>
            <SectionLabel icon={Eye} text="Top pages" />
            {ga4.topPages.length === 0 ? (
              <EmptyHint label="No page-view data yet." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {ga4.topPages.slice(0, 6).map((p) => (
                  <li key={p.path} className="py-2 flex items-center gap-3 text-sm">
                    <span className="flex-1 min-w-0 truncate text-ivory">
                      {p.title ?? p.path}
                    </span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {p.views.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel icon={Globe} text="Top sources" />
            {ga4.topSources.length === 0 ? (
              <EmptyHint label="No source data yet." />
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {ga4.topSources.slice(0, 6).map((s) => (
                  <li
                    key={`${s.source}-${s.medium}`}
                    className="py-2 flex items-center gap-3 text-sm"
                  >
                    <span className="flex-1 truncate text-ivory">{s.source}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {s.medium || "—"}
                    </Badge>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {s.users.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <SectionLabel icon={Smartphone} text="Countries + devices" />
            <div className="space-y-3">
              <ul className="space-y-1.5">
                {ga4.topCountries.slice(0, 4).map((c) => (
                  <li
                    key={c.country}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="flex-1 truncate text-ivory">{c.country}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {c.users.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-white/[0.05]">
                {ga4.devices.map((d) => (
                  <div
                    key={d.category}
                    className="flex items-center gap-3 text-xs py-1"
                  >
                    <span className="capitalize text-muted-foreground flex-1">
                      {d.category}
                    </span>
                    <span className="text-ivory tabular-nums">
                      {d.users.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchPanel({
  gsc,
}: {
  gsc: import("@/server/analytics").AnalyticsSnapshot["gsc"];
}) {
  if (!gsc.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-ember-300" />
            Search Performance · Google Search Console
          </CardTitle>
          <CardDescription>
            How people find heavensleaf.com on Google. Connect GSC to light this
            up.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {gsc.reason ? (
            <p>
              Couldn't reach GSC: <code className="text-amber-300">{gsc.reason}</code>
            </p>
          ) : (
            <p>
              Set <code className="text-ember-200">GOOGLE_CLIENT_EMAIL</code>,{" "}
              <code className="text-ember-200">GOOGLE_PRIVATE_KEY</code>, and{" "}
              <code className="text-ember-200">GSC_SITE_URL</code> in Vercel, then
              grant the service account access in Search Console.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
  const t = gsc.totals;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-ember-300" />
            Search Performance · GSC
          </CardTitle>
          <CardDescription>
            Impressions, clicks, and rankings from Google search.
          </CardDescription>
        </div>
        <Badge variant="success" className="text-[10px]">
          live · GSC
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatusPill label="Impressions" value={t.impressions} />
          <StatusPill label="Clicks" value={t.clicks} />
          <StatusPill
            label="Avg CTR"
            value={Number((t.ctr * 100).toFixed(2))}
          />
          <StatusPill
            label="Avg position"
            value={Number(t.position.toFixed(1))}
          />
        </div>
        <SearchPerformanceTimeseries data={gsc.timeseries} />
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <SectionLabel icon={MousePointerClick} text="Top queries" />
            <ul className="divide-y divide-white/[0.04]">
              {gsc.topQueries.slice(0, 8).map((q) => (
                <li key={q.query} className="py-2 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-sm">
                  <span className="truncate text-ivory">{q.query}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {q.impressions.toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] tabular-nums">
                    {q.clicks} clicks
                  </Badge>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    #{q.position.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel icon={FileText} text="Top pages" />
            <ul className="divide-y divide-white/[0.04]">
              {gsc.topPages.slice(0, 8).map((p) => (
                <li key={p.page} className="py-2 flex items-center gap-3 text-sm">
                  <a
                    href={p.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-ivory hover:text-ember-200"
                  >
                    {new URL(p.page).pathname}
                  </a>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {p.impressions.toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] tabular-nums">
                    {p.clicks} clicks
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionLabel({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
      <Icon className="h-3 w-3" />
      {text}
    </div>
  );
}

function prettyType(t: string) {
  return t
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
function prettyStatus(s: string) {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
