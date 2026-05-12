import {
  CalendarClock,
  FileText,
  Flame,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { EngagementChart } from "@/components/dashboard/engagement-chart";
import { UpcomingQueue } from "@/components/dashboard/upcoming-queue";
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
import {
  demoEngagementSeries,
  getDashboardSnapshot,
} from "@/server/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();
  const series = demoEngagementSeries();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Mission Control"
        title="The fire is steady."
        description="A premium lifestyle media operating system for brotherhood, ritual, and slow living."
      >
        {!snapshot.live && (
          <Badge variant="warning" className="text-[10px]">
            Demo data · run prisma migrate
          </Badge>
        )}
        <Button variant="gold" size="sm" asChild>
          <a href="/studio">
            <Sparkles className="h-4 w-4" /> New Generation
          </a>
        </Button>
      </PageHeader>

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
              EmberOS · Brand Voice Sample
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Scheduled"
          value={snapshot.stats.scheduledCount}
          delta={8.2}
          icon={CalendarClock}
          hint="Across all channels"
        />
        <StatCard
          label="Content Pieces"
          value={snapshot.stats.totalContent}
          delta={12.4}
          icon={FileText}
          hint="All-time library"
        />
        <StatCard
          label="AI Jobs (7d)"
          value={snapshot.stats.aiJobsRecent}
          delta={24.0}
          icon={Sparkles}
          hint="Captions, blogs, devotionals"
        />
        <StatCard
          label="Brotherhood"
          value={snapshot.stats.telegramMembers}
          delta={3.1}
          icon={Users}
          hint={`${snapshot.stats.telegramMsgs} messages this week`}
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
              <CardDescription>Last 14 days · all platforms</CardDescription>
            </div>
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
          </CardHeader>
          <CardContent>
            <EngagementChart data={series} />
          </CardContent>
        </Card>

        <UpcomingQueue items={snapshot.queue} />
      </div>

      {/* Channels overview */}
      <Card>
        <CardHeader>
          <CardTitle>Channels At A Glance</CardTitle>
          <CardDescription>Health snapshot across surfaces</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ChannelTile
              name="Telegram"
              value="348"
              subtitle="Brotherhood members"
              healthy
            />
            <ChannelTile
              name="Instagram"
              value="14.2K"
              subtitle="Followers · 4.2% engage"
              healthy
            />
            <ChannelTile
              name="WordPress"
              value="32"
              subtitle="Indexed articles"
              healthy
            />
            <ChannelTile
              name="YouTube"
              value="2.4K"
              subtitle="Subscribers · 18 videos"
            />
          </div>
          <Separator className="my-6" />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Send className="h-3.5 w-3.5 text-ember-300" />
            Bot:
            <code className="font-mono text-ember-200/80">@HeavensLeafBrotherhoodBot</code>
            <span className="opacity-50">·</span>
            <span>3 daily reflections queued</span>
            <span className="opacity-50">·</span>
            <span>Next ride RSVP: Highway 1 (Sat)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChannelTile({
  name,
  value,
  subtitle,
  healthy,
}: {
  name: string;
  value: string;
  subtitle: string;
  healthy?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-ink-900/40 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {name}
        </div>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            healthy ? "bg-emerald-400 animate-glow" : "bg-amber-400"
          }`}
        />
      </div>
      <div className="font-display text-2xl text-ivory">{value}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}
