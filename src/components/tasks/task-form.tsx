"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createTask, updateTask } from "@/server/actions/tasks";

export type AssignableUser = { id: string; name: string; email: string };
export type TaskContext = { kind: "customer" | "prospect" | "influencer" | "sale"; id: string; label: string } | null;

const todayLocal = () => new Date().toLocaleDateString("en-CA");
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};

export function TaskForm({
  mode,
  taskId,
  users,
  currentUserId,
  context,
  initial,
}: {
  mode: "create" | "edit";
  taskId?: string;
  users: AssignableUser[];
  currentUserId: string;
  context: TaskContext;
  initial: {
    title: string;
    description: string;
    dueDate: string; // yyyy-mm-dd or ""
    priority: "LOW" | "NORMAL" | "HIGH";
    assigneeId: string;
    tags: string[];
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [priority, setPriority] = useState(initial.priority);
  const [assigneeId, setAssigneeId] = useState(initial.assigneeId);
  const [tagText, setTagText] = useState(initial.tags.join(", "));

  const tags = tagText.split(",").map((t) => t.trim()).filter(Boolean);
  const assignee = users.find((u) => u.id === assigneeId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const payload = {
        title,
        description,
        dueDate: dueDate || null,
        priority,
        assigneeId: assigneeId || null,
        tags,
        ...(context ? { [`${context.kind}Id`]: context.id } : {}),
      };
      const r = mode === "create" ? await createTask(payload) : await updateTask(taskId!, payload);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(
        mode === "create"
          ? assignee && assignee.id !== currentUserId
            ? `Task created — ${assignee.name} has been notified.`
            : "Task created."
          : "Task updated.",
      );
      router.push("/tasks");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "What needs doing?" : "Edit task"}</CardTitle>
          {context && (
            <CardDescription className="flex items-center gap-2 flex-wrap">
              About{" "}
              <Badge variant="gold" className="text-[10px]">
                {context.kind === "sale" ? "Invoice" : context.kind[0]!.toUpperCase() + context.kind.slice(1)}
              </Badge>
              <span className="text-ivory">{context.label}</span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call about the overdue invoice" className="mt-1" autoFocus required maxLength={200} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes · optional</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything the assignee needs to know" className="mt-1 min-h-[80px]" maxLength={4000} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Assign to</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-white/10 bg-ink-900 px-3 text-sm text-ivory"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.id === currentUserId ? " (me)" : ""}
                  </option>
                ))}
              </select>
              {assignee && assignee.id !== currentUserId && (
                <p className="mt-1 text-[11px] text-muted-foreground">They get a push notification and an email at {assignee.email}.</p>
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[
                  ["Today", todayLocal()],
                  ["Tomorrow", plusDays(1)],
                  ["In 3 days", plusDays(3)],
                  ["Next week", plusDays(7)],
                  ["No date", ""],
                ].map(([label, v]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDueDate(v!)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${dueDate === v ? "border-ember-500/50 text-ember-200 bg-ember-500/10" : "border-white/10 text-muted-foreground hover:text-ivory"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</label>
              <div className="mt-1 flex gap-1">
                {(["LOW", "NORMAL", "HIGH"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 h-9 rounded-md border text-xs ${priority === p ? (p === "HIGH" ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-ember-500/50 bg-ember-500/10 text-ember-200") : "border-white/10 text-muted-foreground hover:text-ivory"}`}
                  >
                    {p === "LOW" ? "Low" : p === "NORMAL" ? "Normal" : "High"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags · comma separated</label>
              <Input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="collections, follow-up, hashtag" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="gold" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {mode === "create" ? "Create task" : "Save changes"}
        </Button>
        <Button variant="ghost" asChild className="text-muted-foreground">
          <Link href="/tasks">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
