"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteTask, setTaskStatus } from "@/server/actions/tasks";
import type { TaskRow } from "@/server/tasks";
import { cn } from "@/lib/utils";

function dueInfo(iso: string | null): { label: string; tone: "overdue" | "today" | "soon" | "none" } {
  if (!iso) return { label: "No date", tone: "none" };
  const due = new Date(iso);
  const today = new Date();
  const t0 = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const d = Math.round((Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) - t0) / 86400000);
  if (d < -1) return { label: `${-d} days overdue`, tone: "overdue" };
  if (d === -1) return { label: "Yesterday", tone: "overdue" };
  if (d === 0) return { label: "Today", tone: "today" };
  if (d === 1) return { label: "Tomorrow", tone: "soon" };
  if (d <= 6) return { label: due.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }), tone: "soon" };
  return { label: due.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), tone: "none" };
}

export function TaskListClient({ rows, currentUserId, isAdmin, highlightId }: { rows: TaskRow[]; currentUserId: string; isAdmin: boolean; highlightId?: string }) {
  useEffect(() => {
    if (highlightId) document.getElementById(`task-${highlightId}`)?.scrollIntoView({ block: "center" });
  }, [highlightId]);
  return (
    <ul className="divide-y divide-white/[0.04]">
      {rows.map((t) => (
        <TaskItem key={t.id} t={t} currentUserId={currentUserId} isAdmin={isAdmin} highlighted={t.id === highlightId} />
      ))}
    </ul>
  );
}

function TaskItem({ t, currentUserId, isAdmin, highlighted }: { t: TaskRow; currentUserId: string; isAdmin: boolean; highlighted: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const done = t.status === "DONE";
  const due = dueInfo(t.dueAt);
  const canDelete = isAdmin || t.createdBy?.id === currentUserId || t.assignee?.id === currentUserId;

  function toggle() {
    setBusy("toggle");
    start(async () => {
      const r = await setTaskStatus(t.id, done ? "OPEN" : "DONE");
      if (!r.ok) toast.error(r.error);
      else toast.success(done ? "Reopened." : "Done.");
      router.refresh();
      setBusy(null);
    });
  }
  function remove() {
    if (!confirm("Delete this task? This can't be undone.")) return;
    setBusy("delete");
    start(async () => {
      const r = await deleteTask(t.id);
      if (!r.ok) toast.error(r.error);
      router.refresh();
      setBusy(null);
    });
  }

  return (
    <li id={`task-${t.id}`} className={cn("py-3 flex items-start gap-3 -mx-2 px-2 rounded-md", highlighted && "bg-ember-500/[0.06]")}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={done ? "Reopen task" : "Mark done"}
        className={cn("mt-0.5 h-6 w-6 shrink-0 rounded-full border flex items-center justify-center", done ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-white/20 text-muted-foreground hover:border-ember-500/50 hover:text-ember-200")}
      >
        {busy === "toggle" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3 opacity-0" />}
      </button>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm", done ? "text-muted-foreground line-through" : "text-ivory")}>{t.title}</span>
          {t.priority === "HIGH" && !done && <Badge variant="warning" className="text-[9px]">High</Badge>}
          {t.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[9px] opacity-80">{tag}</Badge>
          ))}
        </div>
        {t.description && <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{t.description}</p>}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          {!done && (
            <span className={cn("tabular-nums", due.tone === "overdue" && "text-red-300", due.tone === "today" && "text-amber-300")}>{due.label}</span>
          )}
          {done && t.completedAt && <span>Done {new Date(t.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
          {t.assignee ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-4 w-4 rounded-full bg-ember-500/20 text-ember-200 text-[9px] flex items-center justify-center uppercase">{t.assignee.name[0]}</span>
              {t.assignee.id === currentUserId ? "You" : t.assignee.name}
            </span>
          ) : (
            <span className="italic">Unassigned</span>
          )}
          {t.linked && (
            <Link href={t.linked.href} className="text-ember-200 hover:underline truncate max-w-[16rem]">
              {t.linked.label}
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 text-muted-foreground" aria-label="Edit task">
          <Link href={`/tasks/${t.id}/edit`}><Pencil className="h-3.5 w-3.5" /></Link>
        </Button>
        {done && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" aria-label="Reopen task" onClick={toggle} disabled={pending}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-red-300" aria-label="Delete task" onClick={remove} disabled={pending}>
            {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    </li>
  );
}
