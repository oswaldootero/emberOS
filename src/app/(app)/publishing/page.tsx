import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, ShieldCheck, Twitter, Youtube, Plus } from "lucide-react";

export const metadata = { title: "Publishing" };

const CHANNELS = [
  { name: "Instagram", icon: Instagram, status: "connected", handle: "@heavensleaf" },
  { name: "Facebook", icon: Facebook, status: "connected", handle: "Heaven's Leaf" },
  { name: "YouTube", icon: Youtube, status: "connected", handle: "@heavensleaf" },
  { name: "X / Twitter", icon: Twitter, status: "needs_oauth", handle: "—" },
] as const;

export default function PublishingPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Publishing"
        title="Send the smoke signals."
        description="Schedule, approve, and ship across Instagram, Facebook, YouTube, and X — with Meta-policy guardrails built in."
      >
        <Button variant="gold" size="sm">
          <Plus className="h-4 w-4" /> New Scheduled Post
        </Button>
      </PageHeader>

      {/* Connection grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.name}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-ember-300" />
                  <Badge
                    variant={c.status === "connected" ? "success" : "warning"}
                    className="text-[10px]"
                  >
                    {c.status === "connected" ? "Connected" : "Connect"}
                  </Badge>
                </div>
                <div className="space-y-0.5">
                  <div className="font-medium text-ivory">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.handle}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compliance card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Meta Tobacco Policy Guardrails
          </CardTitle>
          <CardDescription>
            Active checks running on every draft before publish.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Check label="Direct sales language detector (Buy/Shop/Order)" />
          <Check label="Pricing & discount mention blocker" />
          <Check label="Hashtag count cap (Instagram: 30)" />
          <Check label="Engagement-bait phrase detection" />
          <Check label="ALL-CAPS ratio limiter" />
          <Check label="Restricted product category warning (vape, nicotine direct mentions)" />
        </CardContent>
      </Card>

      {/* Approval queue placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>Posts awaiting Content Manager sign-off.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-10 text-center">
            No posts in review. Drafts will appear here automatically.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Check({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-ivory/90">
      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
