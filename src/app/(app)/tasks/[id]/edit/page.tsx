import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/tasks/task-form";
import { requireUser } from "@/server/auth";
import { loadAssignableUsers, loadTask } from "@/server/tasks";

export const metadata = { title: "Edit task" };
export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [task, users] = await Promise.all([loadTask(id), loadAssignableUsers()]);
  if (!task) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/tasks"><ArrowLeft className="h-4 w-4" /> All tasks</Link>
      </Button>
      <PageHeader eyebrow="Tasks" title="Edit task" description="Reassigning notifies the new assignee." />
      <TaskForm
        mode="edit"
        taskId={task.id}
        users={users}
        currentUserId={user.id}
        context={task.linked ? { kind: task.linked.kind, id: task.linked.id, label: task.linked.label } : null}
        initial={{
          title: task.title,
          description: task.description ?? "",
          dueDate: task.dueAt ? task.dueAt.slice(0, 10) : "",
          priority: task.priority,
          assigneeId: task.assignee?.id ?? "",
          tags: task.tags,
        }}
      />
    </div>
  );
}
