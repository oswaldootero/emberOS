import Link from "next/link";
import { CheckSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskListClient } from "@/components/tasks/task-list-client";
import { PushToggle } from "@/components/notifications/push-toggle";
import { requireUser } from "@/server/auth";
import { loadAssignableUsers, loadTasks, type TaskScope } from "@/server/tasks";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const SCOPES: { value: TaskScope; label: string }[] = [
  { value: "mine", label: "Mine" },
  { value: "open", label: "All open" },
  { value: "created", label: "I assigned" },
  { value: "done", label: "Done" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; assignee?: string; q?: string; task?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const scope = (SCOPES.find((s) => s.value === sp.scope)?.value ?? "mine") as TaskScope;
  const [list, users] = await Promise.all([
    loadTasks({ scope, userId: user.id, assigneeId: sp.assignee || undefined, q: sp.q || undefined }),
    loadAssignableUsers(),
  ]);
  const query = (s: TaskScope) => {
    const p = new URLSearchParams();
    if (s !== "mine") p.set("scope", s);
    if (sp.assignee) p.set("assignee", sp.assignee);
    if (sp.q) p.set("q", sp.q);
    const str = p.toString();
    return str ? `/tasks?${str}` : "/tasks";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Tasks"
        description="Assign work to a teammate with a due date. They get a push and an email, and it shows on their Today board."
      >
        <Button variant="gold" size="sm" asChild>
          <Link href="/tasks/new">
            <Plus className="h-4 w-4" /> New task
          </Link>
        </Button>
      </PageHeader>

      <PushToggle publicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null} compact />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1 flex-wrap">
              {SCOPES.map((s) => (
                <Link
                  key={s.value}
                  href={query(s.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs border inline-flex items-center gap-1.5",
                    scope === s.value ? "border-ember-500/40 bg-ember-500/10 text-ember-200" : "border-white/10 text-muted-foreground hover:text-ivory",
                  )}
                >
                  {s.label}
                  <span className="opacity-60 tabular-nums">{list.counts[s.value]}</span>
                </Link>
              ))}
            </div>
            <form action="/tasks" className="flex items-center gap-2 flex-wrap">
              {scope !== "mine" && <input type="hidden" name="scope" value={scope} />}
              <Input name="q" defaultValue={sp.q ?? ""} placeholder="Search tasks…" className="h-8 w-40 sm:w-52 text-xs" />
              {scope !== "mine" && (
                <select name="assignee" defaultValue={sp.assignee ?? ""} className="h-8 rounded-md border border-white/10 bg-ink-900 px-2 text-xs text-ivory">
                  <option value="">Anyone</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
              <Button type="submit" variant="outline" size="sm">Apply</Button>
            </form>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {list.rows.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                {scope === "mine" ? "Nothing assigned to you. Enjoy the cigar." : scope === "done" ? "No completed tasks yet." : "No open tasks match."}
              </p>
              <Button variant="gold" size="sm" asChild>
                <Link href="/tasks/new"><Plus className="h-3.5 w-3.5" /> New task</Link>
              </Button>
            </div>
          ) : (
            <TaskListClient rows={list.rows} currentUserId={user.id} isAdmin={user.role === "ADMIN"} highlightId={sp.task} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
