import Link from "next/link";
import { AlertTriangle, CalendarClock, Package, Plus, Receipt, Target, Wallet } from "lucide-react";
import { NewTaskButton } from "@/components/tasks/new-task-button";
import { PushToggle } from "@/components/notifications/push-toggle";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/shell/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { TodayActions } from "@/components/dashboard/today-actions";
import { RevenueBars } from "@/components/dashboard/revenue-bars";
import { PipelineStages } from "@/components/dashboard/pipeline-stages";
import { HashtagToday } from "@/components/dashboard/hashtag-today";
import { DailyIntentions } from "@/components/dashboard/daily-intentions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth";
import { loadTodayBoard } from "@/server/dashboard";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

export default async function DashboardPage() {
  const user = await requireUser();
  const board = await loadTodayBoard(user.id);
  const firstName = (user.fullName ?? user.email ?? "").split(/[\s@]/)[0] || "there";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const k = board.kpis;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={today}
        title={`What needs you today, ${firstName}.`}
        description="Collections, follow-ups, reorders, mentions, and stock — ranked. Then the sales pulse."
      >
        <NewTaskButton />
        <Button variant="gold" size="sm" asChild>
          <Link href="/sales/new">
            <Plus className="h-4 w-4" /> New invoice
          </Link>
        </Button>
      </PageHeader>

      <PushToggle publicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} compact />

      {/* Sales pulse */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Invoiced this month"
          value={fmtUsd(k.revenueThisMonth)}
          delta={k.revenueDeltaPct ?? undefined}
          icon={Receipt}
          hint={k.revenueDeltaPct == null ? "No invoices last month to compare" : "vs. last month"}
        />
        <StatCard
          label="Outstanding"
          value={fmtUsd(k.outstanding)}
          icon={Wallet}
          hint={k.overdueCount > 0 ? `${fmtUsd(k.overdueAmount)} overdue on ${k.overdueCount} invoice${k.overdueCount === 1 ? "" : "s"}` : "Nothing overdue"}
        />
        <StatCard
          label="Open prospects"
          value={k.openProspects}
          icon={Target}
          hint="In the pipeline, not yet customers"
        />
        <StatCard
          label="Low stock"
          value={k.lowStockCount}
          icon={k.lowStockCount > 0 ? AlertTriangle : Package}
          hint={k.lowStockCount > 0 ? "SKUs at or below reorder threshold" : "All SKUs above threshold"}
        />
      </div>

      {/* Do today + right rail */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-ember-300" /> Do today
            </CardTitle>
            <CardDescription>
              Your tasks plus everything with a date or a dollar attached, most urgent first. Tap a row to act on it.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TodayActions items={board.actions} overflow={board.actionOverflow} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <HashtagToday initial={board.hashtagBrief} />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prospect pipeline</CardTitle>
              <CardDescription>Open prospects by stage.</CardDescription>
            </CardHeader>
            <CardContent>
              <PipelineStages data={board.pipeline} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revenue + top customers */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Invoiced revenue</CardTitle>
            <CardDescription>Last six months, all invoices except drafts and cancellations.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueBars data={board.revenueByMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top customers this month</CardTitle>
            <CardDescription>By invoiced total.</CardDescription>
          </CardHeader>
          <CardContent>
            {board.topCustomersThisMonth.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet this month.</p>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {board.topCustomersThisMonth.map((c, i) => (
                  <li key={c.id} className="py-2 flex items-center gap-3 text-sm">
                    <span className="w-5 text-[10px] text-muted-foreground tabular-nums">{i + 1}</span>
                    <Link href={`/crm/${c.id}`} className="flex-1 min-w-0 truncate text-ivory hover:text-ember-200">
                      {c.name}
                    </Link>
                    <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
                      {c.invoices} inv
                    </span>
                    <span className="text-ember-200 tabular-nums">{fmtUsd(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI content ideas for the day */}
      <DailyIntentions />
    </div>
  );
}
