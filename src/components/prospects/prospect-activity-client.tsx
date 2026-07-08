"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Plus,
  StickyNote,
  ListTodo,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  completeProspectTask,
  logProspectActivity,
} from "@/server/actions/prospects";

const KINDS = [
  { value: "CALL", label: "Call", icon: Phone },
  { value: "MEETING", label: "Meeting", icon: Calendar },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "SMS", label: "Text", icon: MessageSquare },
  { value: "NOTE", label: "Note", icon: StickyNote },
  { value: "TASK", label: "Task / follow-up", icon: ListTodo },
  { value: "SAMPLE", label: "Samples delivered", icon: Package },
  { value: "VISIT", label: "Visit", icon: MapPin },
] as const;

export type ActivityRow = {
  id: string;
  kind: string;
  summary: string;
  detail: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  actor: string | null;
};

export function ProspectActivityClient({
  prospectId,
  activities,
}: {
  prospectId: string;
  activities: ActivityRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string>("CALL");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [dueAt, setDueAt] = useState("");

  function submit() {
    if (!summary.trim()) {
      toast.error("Write a short summary.");
      return;
    }
    startTransition(async () => {
      const r = await logProspectActivity({
        prospectId,
        kind,
        summary,
        detail: detail || null,
        dueAt: kind === "TASK" && dueAt ? dueAt : null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Logged.");
      setSummary("");
      setDetail("");
      setDueAt("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {activities.length === 0
            ? "No activity yet — log the first touch."
            : `${activities.length} activit${activities.length === 1 ? "y" : "ies"} on record.`}
        </p>
        <Button
          variant={open ? "ghost" : "gold"}
          size="sm"
          onClick={() => setOpen((s) => !s)}
        >
          <Plus className="h-3.5 w-3.5" />
          {open ? "Cancel" : "Log activity"}
        </Button>
      </div>

      {open && (
        <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-3 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {kind === "TASK" && (
              <Input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-9 text-xs"
                aria-label="Due date"
              />
            )}
          </div>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary — e.g. Called Marcus, interested in Maduro samples"
            className="text-xs"
          />
          <Textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Details (optional)"
            rows={2}
            className="text-xs"
          />
          <div className="flex justify-end">
            <Button variant="gold" size="sm" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      )}

      <ol className="relative border-l border-white/[0.08] ml-2 space-y-4">
        {activities.map((a) => {
          const Icon = KINDS.find((k) => k.value === a.kind)?.icon ?? StickyNote;
          const isOpenTask = a.kind === "TASK" && !a.completedAt;
          return (
            <li key={a.id} className="ml-4">
              <span className="absolute -left-[9px] mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-850 border border-white/10">
                <Icon className="h-2.5 w-2.5 text-ember-300" />
              </span>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-ivory">
                    {a.summary}
                    {a.completedAt && (
                      <span className="ml-2 text-[10px] text-emerald-300">done</span>
                    )}
                  </div>
                  {a.detail && (
                    <p className="text-[11px] text-muted-foreground whitespace-pre-wrap mt-0.5">
                      {a.detail}
                    </p>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(a.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {a.actor && ` · ${a.actor}`}
                    {a.dueAt &&
                      ` · due ${new Date(a.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </div>
                </div>
                {isOpenTask && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await completeProspectTask(a.id);
                        if (!r.ok) toast.error(r.error);
                        else router.refresh();
                      })
                    }
                  >
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
