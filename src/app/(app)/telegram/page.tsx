import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Crown, Send, Sparkles, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Telegram Command Center" };

async function loadTelegram() {
  try {
    const [members, topContributors, recentMsgs] = await Promise.all([
      prisma.telegramMember.count(),
      prisma.telegramMember.findMany({
        orderBy: { contributionScore: "desc" },
        take: 5,
      }),
      prisma.telegramMessage.count({
        where: {
          sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return { live: true, members, topContributors, recentMsgs };
  } catch {
    return {
      live: false,
      members: 348,
      topContributors: [
        { id: "1", firstName: "Marco", username: "marco_rides", contributionScore: 94.2 },
        { id: "2", firstName: "Daniel", username: "danfromparis", contributionScore: 88.7 },
        { id: "3", firstName: "Eli", username: "elj_writes", contributionScore: 81.3 },
        { id: "4", firstName: "Tobias", username: "tobi_t", contributionScore: 76.0 },
        { id: "5", firstName: "Brandon", username: "bk__", contributionScore: 72.5 },
      ],
      recentMsgs: 1244,
    };
  }
}

export default async function TelegramPage() {
  const data = await loadTelegram();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Brotherhood Command"
        title="Heaven's Leaf Brotherhood Bot."
        description="Daily reflections, cigar check-ins, event reminders, scripture prompts, FAQ — all from one bot."
      >
        {!data.live && <Badge variant="warning">Demo data</Badge>}
        <Button variant="outline" size="sm">
          <Bot className="h-4 w-4" /> Bot Settings
        </Button>
        <Button variant="gold" size="sm">
          <Send className="h-4 w-4" /> Compose Broadcast
        </Button>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-ember-500/10 blur-3xl" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-ember-300" />
              @HeavensLeafBrotherhoodBot
            </CardTitle>
            <CardDescription>
              Connected via webhook · 3 daily reflections queued
            </CardDescription>
          </CardHeader>
          <CardContent className="relative grid sm:grid-cols-2 gap-3">
            <BotAbility
              title="Daily Reflections"
              description="Auto-post at 7:00am local — pulled from devotionals."
            />
            <BotAbility
              title="Cigar Check-ins"
              description="Members /smoke to log a session. Tracks streaks."
            />
            <BotAbility
              title="Event Reminders"
              description="24h, 2h, and at-start pings for community events."
            />
            <BotAbility
              title="Scripture Prompts"
              description="Sunday-morning verse with one reflective question."
            />
            <BotAbility
              title="FAQ Handler"
              description="Auto-answers common product, lounge, and DSA questions."
            />
            <BotAbility
              title="Welcome Onboarding"
              description="Personalized 3-message welcome sequence for new members."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-ember-300" />
              Top Contributors
            </CardTitle>
            <CardDescription>By contribution score · last 30d</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topContributors.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="w-5 text-xs text-muted-foreground font-mono">
                  {i + 1}.
                </div>
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-ember-400 to-tobacco-600 text-ink-950 flex items-center justify-center text-[10px] font-semibold">
                  {m.firstName?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-ivory">{m.firstName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    @{m.username}
                  </div>
                </div>
                <Badge variant="gold" className="text-[10px] tabular-nums">
                  {m.contributionScore.toFixed(1)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <StatBox icon={Users} label="Members" value={data.members} hint="+12 this week" />
        <StatBox
          icon={Send}
          label="Messages (7d)"
          value={data.recentMsgs}
          hint="3.6 avg per active member"
        />
        <StatBox
          icon={Sparkles}
          label="AI Replies Sent"
          value={42}
          hint="From bot FAQ handler"
        />
      </div>
    </div>
  );
}

function BotAbility({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-ink-900/60 p-4 space-y-1">
      <div className="text-sm font-medium text-ivory">{title}</div>
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Icon className="h-4 w-4 text-ember-300/80" />
          {label}
        </div>
        <div className="font-display text-3xl text-ivory">
          {value.toLocaleString()}
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
