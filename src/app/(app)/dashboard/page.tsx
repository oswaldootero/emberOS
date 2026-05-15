import Link from "next/link";
import {
  CalendarClock,
  Database,
  FileSpreadsheet,
  FileText,
  Flame,
  Send,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { UpcomingQueue } from "@/components/dashboard/upcoming-queue";
import { DailyIntentions } from "@/components/dashboard/daily-intentions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getDashboardSnapshot } from "@/server/dashboard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mission Control"
        title="The fire is steady."
        description="A premium media operating system for brotherhood, ritual, and slow living."
      >
        <Button variant="gold" size="sm" asChild>
          <a href="/studio">
            <Sparkles className="h-4 w-4" /> New Generation
          </a>
        </Button>
      </PageHeader>

      {/* Today's intentions — boutique-cigar gap analysis */}
      <DailyIntentions />

      {/* Hero quote */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-ember-glow opacity-60" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-ember-500/10 blur-3xl" />
        <CardContent className="relative p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <Flame className="h-10 w-10 text-ember-300 shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="font-display text-xl md:text-2xl text-ivory tracking-tight italic">
              "Brothers don't gather for the cigar — they gather for the silence
              between the draws."
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              EmberOS · Brand Voice
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Real-data KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Scheduled"
          value={snapshot.stats.scheduledCount}
          icon={CalendarClock}
          hint="Posts in the queue"
        />
        <StatCard
          label="Content library"
          value={snapshot.stats.totalContent}
          icon={FileText}
          hint="All-time pieces created"
        />
        <StatCard
          label="AI generations (7d)"
          value={snapshot.stats.aiJobsRecent}
          icon={Sparkles}
          hint="Studio + Repurpose + Image"
        />
        <StatCard
          label="Brotherhood"
          value={snapshot.stats.telegramMembers}
          icon={Users}
          hint={
            snapshot.stats.telegramMsgs > 0
              ? `${snapshot.stats.telegramMsgs} messages this week`
              : "Connect Telegram bot to populate"
          }
        />
      </div>

      {/* Engagement + Queue */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-ember-300" />
                Engagement & Reach
              </CardTitle>
              <CardDescription>
                {snapshot.engagementSource === "imports"
                  ? "Daily totals from your imported Meta data."
                  : "No imports yet — upload an Instagram or Facebook Content CSV to populate."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={
                  snapshot.engagementSource === "imports" ? "success" : "outline"
                }
                className="text-[10px]"
              >
                {snapshot.engagementSource === "imports" ? "live" : "no data"}
              </Badge>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-ember-300" />
                  Engagement
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-tobacco-400" />
                  Reach
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {snapshot.engagementSource === "imports" ? (
              <EngagementChart data={snapshot.engagementSeries} />
            ) : (
              <EmptyEngagement />
            )}
          </CardContent>
        </Card>

        <UpcomingQueue items={snapshot.queue} />
      </div>

      {/* Channels At A Glance — REAL DATA ONLY */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Channels At A Glance</CardTitle>
            <CardDescription>
              Live numbers from your imports, WordPress, and Telegram. Dashes
              mean nothing imported yet.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics/import">
              <UploadCloud className="h-4 w-4" /> Import data
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshot.channels.map((c) => (
              <ChannelTile key={c.name} channel={c} />
            ))}
          </div>
          <Separator className="my-6" />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Send className="h-3.5 w-3.5 text-ember-300" />
            Bot: <code className="font-mono text-ember-200/80">@HeavensLeafBrotherhoodBot</code>
            <span className="opacity-50">·</span>
            <span>{snapshot.stats.scheduledCount} posts queued</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelTile({
  channel,
}: {
  channel: {
    name: string;
    value: string;
    subtitle: string;
    source: "live" | "import" | "demo";
    healthy: boolean;
  };
}) {
  const tone =
    channel.source === "live"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      : channel.source === "import"
        ? "bg-ember-500/10 text-ember-200 border-ember-500/20"
        : "bg-white/[0.02] text-muted-foreground border-white/[0.04]";

  return (
    <div
      className={cn(
        "rounded-lg border bg-ink-900/40 p-4 space-y-2",
        channel.source === "live"
          ? "border-white/[0.04]"
          : channel.source === "import"
            ? "border-white/[0.04]"
            : "border-dashed border-white/[0.06]",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {channel.name}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${tone}`}
        >
          {channel.source === "live" ? (
            <>
              <Database className="h-2.5 w-2.5" /> live
            </>
          ) : channel.source === "import" ? (
            <>
              <FileSpreadsheet className="h-2.5 w-2.5" /> import
            </>
          ) : (
            "—"
          )}
        </span>
      </div>
      <div className="font-display text-2xl text-ivory tabular-nums">
        {channel.value}
      </div>
      <div className="text-[11px] text-muted-foreground">{channel.subtitle}</div>
    </div>
  );
}

function EmptyEngagement() {
  return (
    <div className="h-[260px] flex flex-col items-center justify-center text-center space-y-2">
      <UploadCloud className="h-7 w-7 text-ember-300/50" />
      <div className="text-sm text-muted-foreground max-w-sm">
        Upload an Instagram or Facebook Content insights CSV from{" "}
        <Link
          href="/analytics/guide"
          className="text-ember-300 underline-offset-2 hover:underline"
        >
          the guide
        </Link>{" "}
        and this chart fills with your real engagement.
      </div>
    </div>
  );
}
