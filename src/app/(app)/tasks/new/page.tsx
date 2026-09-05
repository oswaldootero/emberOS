import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/tasks/task-form";
import { requireUser } from "@/server/auth";
import { loadAssignableUsers, loadTaskContext } from "@/server/tasks";

export const metadata = { title: "New task" };
export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; prospect?: string; influencer?: string; sale?: string; title?: string; tag?: string; due?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const [users, context] = await Promise.all([loadAssignableUsers(), loadTaskContext(sp)]);
  const suggested = context && "suggestedAssigneeId" in context ? context.suggestedAssigneeId : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/tasks"><ArrowLeft className="h-4 w-4" /> All tasks</Link>
      </Button>
      <PageHeader eyebrow="Tasks" title="New task" description="Pick who, pick when. The rest is optional." />
      <TaskForm
        mode="create"
        users={users}
        currentUserId={user.id}
        context={context ? { kind: context.kind, id: context.id, label: context.label } : null}
        initial={{
          title: sp.title ?? "",
          description: "",
          dueDate: sp.due ?? "",
          priority: "NORMAL",
          assigneeId: suggested ?? user.id,
          tags: sp.tag ? [sp.tag] : [],
        }}
      />
    </div>
  );
}
