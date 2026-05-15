import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Lightbulb,
  Search,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "How to Upload Analytics" };

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics · How to upload"
        title="Feed the dashboard."
        description="Each platform exports differently. Pick yours below for the exact clicks. Recommended cadence: Sunday morning, ~5 minutes per source."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/analytics">
            <ArrowLeft className="h-4 w-4" /> Back to Analytics
          </Link>
        </Button>
        <Button variant="gold" size="sm" asChild>
          <Link href="/analytics/import">
            <UploadCloud className="h-4 w-4" /> Open Import Page
          </Link>
        </Button>
      </PageHeader>

      {/* Quick overview card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-ember-300 shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-ivory/90 leading-relaxed">
              <p>
                EmberOS pulls performance data from CSV files you export from
                each platform. Once a week is plenty. The dashboard then shows
                a unified view + the AI tells you what's working.
              </p>
              <p className="text-muted-foreground text-xs">
                Tip — if a step doesn't match what you see (Meta moves things
                constantly), open the platform's own search and look for
                "Export."
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed instructions */}
      <Tabs defaultValue="instagram">
        <TabsList className="flex-wrap">
          <TabsTrigger value="instagram">
            <Instagram className="h-3.5 w-3.5" /> Instagram
          </TabsTrigger>
          <TabsTrigger value="facebook">
            <Facebook className="h-3.5 w-3.5" /> Facebook
          </TabsTrigger>
          <TabsTrigger value="ga4">
            <Globe className="h-3.5 w-3.5" /> Google Analytics
          </TabsTrigger>
          <TabsTrigger value="gsc">
            <Search className="h-3.5 w-3.5" /> Search Console
          </TabsTrigger>
        </TabsList>

        {/* INSTAGRAM */}
        <TabsContent value="instagram">
          <PlatformGuide
            icon={Instagram}
            name="Instagram"
            source="INSTAGRAM"
            description="Per-post data: reach, impressions, reactions, comments, shares, saves."
            prerequisite={[
              "Instagram Business or Creator Account (not personal)",
              "Connected to your Facebook Page",
              "Admin or Editor access via Meta Business Suite",
            ]}
            steps={[
              {
                title: "Open Meta Business Suite",
                detail:
                  "Sign in with the Facebook account that admins your Page.",
                url: "https://business.facebook.com/latest/insights",
              },
              {
                title: "Switch to your Instagram account",
                detail:
                  "Top-left dropdown — make sure Instagram is selected (not Facebook).",
              },
              {
                title: "Click Content in the left sidebar",
                detail:
                  "You'll see a list of your posts with metrics.",
              },
              {
                title: "Set date range top-right",
                detail: "Last 7 days for weekly cadence, or Last 28 days.",
              },
              {
                title: "Export → CSV",
                detail:
                  "Top-right corner: ⋯ menu → Export. Pick CSV format. File downloads.",
              },
            ]}
            uploadAs="Content insights (posts / reels)"
            gotchas={[
              {
                problem: "Export button is hidden / grayed out",
                fix: "You may not have admin access, or Meta removed it from your account type. Try the Reports tool at business.facebook.com/latest/reports instead.",
              },
              {
                problem: "Numbers all show zero",
                fix: "Date range probably excluded any posts. Try Last 28 days minimum.",
              },
              {
                problem: "Instagram account not showing in the dropdown",
                fix: "IG must be Business/Creator AND linked to your FB Page. Convert via IG app → Settings → Account → Switch to Professional, then connect to FB Page.",
              },
            ]}
          />
        </TabsContent>

        {/* FACEBOOK */}
        <TabsContent value="facebook">
          <PlatformGuide
            icon={Facebook}
            name="Facebook"
            source="FACEBOOK"
            description="Per-post data: reach, impressions, reactions, comments, shares."
            prerequisite={[
              "Facebook Page for Heaven's Leaf",
              "Admin or Editor access",
            ]}
            steps={[
              {
                title: "Open Meta Business Suite",
                detail:
                  "Same URL as Instagram — they share one tool.",
                url: "https://business.facebook.com/latest/insights",
              },
              {
                title: "Switch to your Facebook Page",
                detail:
                  "Top-left dropdown — pick the FB Page (not the IG account).",
              },
              {
                title: "Click Content in the left sidebar",
                detail: "List of posts appears with their metrics.",
              },
              {
                title: "Set date range",
                detail: "Top-right corner. Last 7 or Last 28 days.",
              },
              {
                title: "Export → CSV",
                detail: "⋯ menu top-right → Export → CSV.",
              },
            ]}
            uploadAs="Content insights (posts)"
            gotchas={[
              {
                problem: "Export button hidden",
                fix: "Fallback: go directly to your Facebook Page → Insights tab → Export Data top-right. Classic Page Insights still works.",
              },
              {
                problem: "CSV opens with garbled emoji",
                fix: "Don't open in Excel first — upload directly to EmberOS. Excel mangles UTF-8.",
              },
            ]}
          />
        </TabsContent>

        {/* GA4 */}
        <TabsContent value="ga4">
          <PlatformGuide
            icon={Globe}
            name="Google Analytics 4"
            source="GA4"
            description="Website visitors, sources, top pages, demographics."
            prerequisite={[
              "Active GA4 property tracking heavensleaf.com",
              "At least 24 hours of tracked data",
              "Editor or Viewer access to the property",
            ]}
            steps={[
              {
                title: "Open Google Analytics",
                detail:
                  "Top-left dropdown — pick your Heaven's Leaf property.",
                url: "https://analytics.google.com",
              },
              {
                title: "Open a report from the left sidebar",
                detail:
                  "Reports → Acquisition → Traffic acquisition is the most useful starting point. Also worth grabbing: Engagement → Pages and screens, and User → Demographics.",
              },
              {
                title: "Set the date range",
                detail:
                  "Top-right of the report. Last 28 days is the sweet spot.",
              },
              {
                title: "Share icon (↗) top-right corner",
                detail:
                  "If you don't see Share, look for the three vertical dots menu.",
              },
              {
                title: "Download file → Download CSV",
                detail:
                  "File downloads as `Traffic acquisition - Session source...csv` or similar.",
              },
            ]}
            uploadAs="Traffic acquisition (or Pages and screens, or Demographics)"
            gotchas={[
              {
                problem: "Report is empty / no data",
                fix: "GA4 tracking script may not be live on heavensleaf.com yet. Confirm tag is firing via the Realtime report.",
              },
              {
                problem: "Parser says 'Couldn't find header row'",
                fix: "Don't open the CSV in Excel before uploading — Excel adds a BOM byte that breaks parsing. Re-export from GA4 directly.",
              },
            ]}
          />
        </TabsContent>

        {/* GSC */}
        <TabsContent value="gsc">
          <PlatformGuide
            icon={Search}
            name="Google Search Console"
            source="GSC"
            description="Keywords driving search traffic, rankings, click-through rates."
            prerequisite={[
              "heavensleaf.com verified as a property in Search Console",
              "Owner or Full User access",
            ]}
            steps={[
              {
                title: "Open Search Console",
                detail:
                  "Top-left dropdown — pick the heavensleaf.com property.",
                url: "https://search.google.com/search-console",
              },
              {
                title: "Click Performance → Search results",
                detail:
                  "Left sidebar. Default landing page after picking the property.",
              },
              {
                title: "Date range (optional)",
                detail:
                  "Default 'Last 3 months' is perfect — gives reliable ranking data.",
              },
              {
                title: "Click Export ↑ top-right corner",
                detail: "Choose Download CSV.",
              },
              {
                title: "Unzip the ZIP file",
                detail:
                  "You'll get 6 CSVs. Use Queries.csv and Pages.csv. Ignore the others — they're not parsed.",
              },
            ]}
            uploadAs="Performance — Queries  (and again with Performance — Pages)"
            gotchas={[
              {
                problem: "Search Console shows 'No data'",
                fix: "Property might not be verified, or it's a URL-prefix property excluding www. Re-verify if needed.",
              },
              {
                problem: "Only got a ZIP file",
                fix: "Normal — that's the only export format. Unzip it. Upload Queries.csv and Pages.csv separately.",
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Upload step (common across all) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-ember-300" />
            Upload step (same for every platform)
          </CardTitle>
          <CardDescription>
            Once you have any CSV in hand, the upload flow is identical.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Step n={1} text="Open the Import page from the button above (or in the topbar of /analytics)." />
          <Step n={2} text="Pick the source platform from the first dropdown." />
          <Step n={3} text="Pick the report type from the second dropdown — match it to what you exported." />
          <Step n={4} text="(Optional) Add a label like 'May 7–13' to find this import easily later." />
          <Step n={5} text="Drag the CSV file in — or click to browse." />
          <Step n={6} text="Click Import. You'll land back on /analytics with new data in the dashboard." />
          <div className="pt-2">
            <Button variant="gold" asChild>
              <Link href="/analytics/import">
                <UploadCloud className="h-4 w-4" /> Go to Import Page
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommended cadence */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended cadence — Sunday morning ritual</CardTitle>
          <CardDescription>~15 minutes once a week.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-ivory/90 list-decimal list-inside">
            <li>Export Instagram Content insights (Last 7 days) → upload</li>
            <li>Export Facebook Content insights (Last 7 days) → upload</li>
            <li>Export GSC Queries (default 3 months) → upload Queries.csv</li>
            <li>Export GA4 Traffic acquisition (Last 7 days) → upload</li>
            <li>Click <span className="text-ember-200 font-medium">Generate insights</span> on /analytics</li>
            <li>Read the 2-minute review. Decide what to write this week.</li>
            <li>On any top performer card, click <span className="text-ember-200 font-medium">Riff on this in Studio</span> to write more in its spirit.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

function PlatformGuide({
  icon: Icon,
  name,
  source,
  description,
  prerequisite,
  steps,
  uploadAs,
  gotchas,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  source: string;
  description: string;
  prerequisite: string[];
  steps: { title: string; detail: string; url?: string }[];
  uploadAs: string;
  gotchas: { problem: string; fix: string }[];
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-ember-glow opacity-30 pointer-events-none" />
      <CardHeader className="relative">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-ember-500/10 border border-ember-500/20 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-ember-300" />
          </div>
          <div className="flex-1">
            <CardTitle>{name}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-6">
        {/* Prerequisites */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Before you start
          </div>
          <ul className="space-y-1.5">
            {prerequisite.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ivory/90">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-1" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            The clicks
          </div>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-ember-500/15 border border-ember-500/30 flex items-center justify-center text-[11px] font-mono text-ember-200 shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="text-sm text-ivory font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.detail}</div>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-ember-300 hover:underline"
                    >
                      {s.url} <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Upload as */}
        <div className="rounded-lg border border-ember-500/20 bg-ember-500/5 p-4 flex items-start gap-3">
          <UploadCloud className="h-4 w-4 text-ember-300 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="text-xs uppercase tracking-wider text-ember-200">
              Upload to EmberOS as
            </div>
            <div className="text-sm text-ivory font-medium">{uploadAs}</div>
          </div>
          <Button variant="gold" size="sm" asChild>
            <Link href={`/analytics/import?source=${source}`}>
              Open Import <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Gotchas */}
        {gotchas.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Common gotchas
            </div>
            <div className="space-y-2">
              {gotchas.map((g, i) => (
                <div
                  key={i}
                  className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3"
                >
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <div className="text-xs font-medium text-ivory">
                        {g.problem}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {g.fix}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-6 w-6 rounded-full bg-ink-700 border border-white/[0.06] flex items-center justify-center text-[11px] font-mono text-muted-foreground shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm text-ivory/90">{text}</div>
    </div>
  );
}
