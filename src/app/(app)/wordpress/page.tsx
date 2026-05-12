import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Globe, Plus } from "lucide-react";

export const metadata = { title: "WordPress" };

export default function WordPressPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="WordPress"
        title="Long-form. Indexed. Owned."
        description="Publish drafts, schedule articles, manage SEO meta, and sync analytics from heavensleaf.com."
      >
        <Button variant="outline" size="sm">
          <Globe className="h-4 w-4" /> Open Site
        </Button>
        <Button variant="gold" size="sm" asChild>
          <a href="/studio">
            <Plus className="h-4 w-4" /> New Article
          </a>
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-ember-300" /> Recent Articles
          </CardTitle>
          <CardDescription>From the connected WordPress site via REST API.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 divide-y divide-white/[0.04]">
            {[
              { title: "The Ritual of Sunday Smoke", status: "Published", date: "May 5, 2026" },
              { title: "What I Learned on Highway 1", status: "Scheduled", date: "May 14, 2026" },
              { title: "Why Slow Living Isn't Slow At All", status: "Draft", date: "—" },
            ].map((a) => (
              <div
                key={a.title}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm text-ivory truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.date}</div>
                </div>
                <Badge
                  variant={
                    a.status === "Published"
                      ? "success"
                      : a.status === "Scheduled"
                        ? "gold"
                        : "outline"
                  }
                  className="text-[10px]"
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
