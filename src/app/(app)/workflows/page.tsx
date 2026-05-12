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
import { Plus, Workflow, ChevronRight } from "lucide-react";

export const metadata = { title: "Workflows" };

const SAMPLE_WORKFLOWS = [
  {
    name: "Blog Cascade",
    trigger: "When a blog is published",
    steps: [
      "Generate Instagram caption",
      "Generate Telegram version",
      "Generate email newsletter draft",
      "Generate 6 quote graphics",
      "Queue social posts for next 5 days",
    ],
    active: true,
  },
  {
    name: "Sunday Reflection",
    trigger: "Every Sunday at 6:30am",
    steps: [
      "AI-generate devotional from current campaign theme",
      "Auto-post to Telegram brotherhood channel",
      "Cross-post quote graphic to Instagram",
    ],
    active: true,
  },
  {
    name: "Ride Recap",
    trigger: "When a 'ride' tag is detected in Telegram",
    steps: [
      "Summarize ride messages into recap",
      "Draft Instagram carousel",
      "Send draft to Content Manager for approval",
    ],
    active: false,
  },
];

export default function WorkflowsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workflows"
        title="Automation that respects the craft."
        description="Visual pipelines that turn one moment into many. Trigger → AI → publish — all in your voice."
      >
        <Button variant="gold" size="sm">
          <Plus className="h-4 w-4" /> New Workflow
        </Button>
      </PageHeader>

      <div className="space-y-4">
        {SAMPLE_WORKFLOWS.map((w) => (
          <Card key={w.name} className="group hover:border-ember-500/30 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-ember-300" />
                  {w.name}
                </CardTitle>
                <CardDescription>{w.trigger}</CardDescription>
              </div>
              <Badge variant={w.active ? "success" : "outline"}>
                {w.active ? "Active" : "Paused"}
              </Badge>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-wrap items-center gap-2 text-xs">
                {w.steps.map((step, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div className="rounded-md border border-white/[0.06] bg-ink-900/60 px-3 py-1.5 text-ivory">
                      <span className="text-ember-300 font-mono mr-1.5">
                        {i + 1}.
                      </span>
                      {step}
                    </div>
                    {i < w.steps.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
