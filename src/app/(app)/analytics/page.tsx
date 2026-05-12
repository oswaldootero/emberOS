import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlatformBars, ThemePie } from "@/components/analytics/charts";
import { StatCard } from "@/components/dashboard/stat-card";
import { Eye, Heart, Share2, TrendingUp } from "lucide-react";

export const metadata = { title: "Analytics" };

const platformData = [
  { platform: "Instagram", impressions: 84000, engagement: 4200 },
  { platform: "Facebook", impressions: 31000, engagement: 980 },
  { platform: "YouTube", impressions: 22000, engagement: 1850 },
  { platform: "Telegram", impressions: 9400, engagement: 2240 },
  { platform: "Blog", impressions: 14800, engagement: 620 },
];

const themeData = [
  { name: "Brotherhood", value: 34 },
  { name: "Reflection", value: 26 },
  { name: "Motorcycle", value: 18 },
  { name: "Faith", value: 14 },
  { name: "Craft", value: 8 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="What's resonating, and why."
        description="Engagement, content performance, Telegram growth, blog traffic, and topic resonance."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reach" value={161200} delta={12.4} icon={Eye} hint="Last 30d" />
        <StatCard label="Engagements" value={9890} delta={8.7} icon={Heart} />
        <StatCard label="Shares" value={1240} delta={4.1} icon={Share2} />
        <StatCard label="Engagement Rate" value="6.1%" delta={1.4} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Platform Comparison</CardTitle>
            <CardDescription>Impressions vs engagement · last 30d</CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformBars data={platformData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top-Performing Themes</CardTitle>
            <CardDescription>By engagement share</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemePie data={themeData} />
            <ul className="mt-3 space-y-1 text-xs">
              {themeData.map((t) => (
                <li
                  key={t.name}
                  className="flex justify-between text-muted-foreground"
                >
                  <span>{t.name}</span>
                  <span className="font-mono text-ivory">{t.value}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
