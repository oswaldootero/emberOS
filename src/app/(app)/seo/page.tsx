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
import { Search, TrendingUp, Layers, Lightbulb } from "lucide-react";

export const metadata = { title: "SEO Command" };

const CLUSTERS = [
  {
    name: "Cigar Rituals",
    keywords: 18,
    avgRank: 9.4,
    movement: "+2.1",
    color: "from-ember-500/20",
  },
  {
    name: "Brotherhood & Community",
    keywords: 12,
    avgRank: 14.8,
    movement: "+0.4",
    color: "from-tobacco-500/20",
  },
  {
    name: "Slow Living",
    keywords: 24,
    avgRank: 11.2,
    movement: "+3.7",
    color: "from-ember-500/20",
  },
  {
    name: "Motorcycle Culture",
    keywords: 9,
    avgRank: 22.1,
    movement: "-1.2",
    color: "from-tobacco-500/20",
  },
  {
    name: "Lounge & Craft",
    keywords: 14,
    avgRank: 17.5,
    movement: "+1.8",
    color: "from-ember-500/20",
  },
];

const IDEAS = [
  "The Quiet Theology of the Cigar Lounge",
  "Saturday Rituals: A Brotherhood Without Apps",
  "Slow Living and the Art of Drawing Breath",
  "Why Cigars Belong in the Conversation About Mental Health",
  "The Long Road: Stories from Heaven's Leaf Rides",
];

export default function SEOPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SEO Command"
        title="Where the search trail leads."
        description="Cluster tracking, content gaps, internal linking, and Google Search Console syncing."
      >
        <Button variant="gold" size="sm">
          <Search className="h-4 w-4" /> Add Keyword
        </Button>
      </PageHeader>

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={Search} label="Tracked Keywords" value="77" hint="+12 this month" />
        <Stat icon={TrendingUp} label="Avg Rank" value="14.2" hint="↑ 2.1 vs last month" />
        <Stat icon={Layers} label="Topic Clusters" value="5" hint="3 healthy · 2 watch" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-ember-300" /> Topic Clusters
          </CardTitle>
          <CardDescription>AI-grouped semantic territory.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CLUSTERS.map((c) => (
              <div
                key={c.name}
                className={`relative rounded-lg border border-white/[0.05] bg-gradient-to-br ${c.color} via-ink-900/60 to-ink-900 p-4 space-y-2`}
              >
                <div className="text-sm font-medium text-ivory">{c.name}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{c.keywords} keywords</span>
                  <span className="opacity-50">·</span>
                  <span>avg #{c.avgRank}</span>
                </div>
                <Badge
                  variant={c.movement.startsWith("+") ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {c.movement}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-ember-300" />
            AI Content Ideas
          </CardTitle>
          <CardDescription>
            Generated from current cluster gaps and brand voice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {IDEAS.map((idea, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-ink-900/40 px-4 py-3 hover:border-ember-500/30 transition-colors group"
              >
                <span className="text-sm text-ivory group-hover:text-ember-100">
                  {idea}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/studio">Draft</a>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
          <Icon className="h-4 w-4 text-ember-300/80" /> {label}
        </div>
        <div className="font-display text-3xl text-ivory">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
