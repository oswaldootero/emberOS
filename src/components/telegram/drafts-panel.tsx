"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  approveDraft,
  unapproveDraft,
  sendDraft,
  discardDraft,
  regenerateDraft,
  generateFreshDraft,
} from "@/server/actions/telegram";

export type DraftRow = {
  id: string;
  text: string;
  theme: string | null;
  source: string;
  status: "PENDING" | "APPROVED" | "SENT" | "DISCARDED";
  parseMode: string;
  proposedFor: string | null; // ISO date or null
  createdAt: string;
};

export function DraftsPanel({ drafts }: { drafts: DraftRow[] }) {
  const [pending, startTransition] = useTransition();

  function handleNewDraft() {
    startTransition(async () => {
      const r = await generateFreshDraft();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Fresh draft added.");
    });
  }

  // Build a 7-day grid: today + next 6
  const days = buildSevenDayWindow();
  const byDay = groupByDay(drafts);

  // Counts for the header
  const approvedCount = drafts.filter((d) => d.status === "APPROVED").length;
  const pendingCount = drafts.filter((d) => d.status === "PENDING").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-ember-300" />
            This week's reflections
          </CardTitle>
          <CardDescription>
            One draft per day for the next week. Approve the ones you want — the
            cron sends them automatically on their day. Discard the ones you don't.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="success" className="text-[10px]">
            {approvedCount} approved
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {pendingCount} awaiting review
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewDraft}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            Extra draft
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {days.map((day) => {
            const dayDrafts = byDay.get(dayKey(day)) ?? [];
            return (
              <DaySection key={dayKey(day)} day={day} drafts={dayDrafts} />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DaySection({ day, drafts }: { day: Date; drafts: DraftRow[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = day.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = day.toDateString() === tomorrow.toDateString();

  const label = isToday
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : day.toLocaleDateString("en-US", {
          weekday: "long",
        });
  const dateLabel = day.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Determine the headline status for this day
  const hasApproved = drafts.some((d) => d.status === "APPROVED");
  const hasSent = drafts.some((d) => d.status === "SENT");
  const hasPending = drafts.some((d) => d.status === "PENDING");
  const allDiscarded =
    drafts.length > 0 && drafts.every((d) => d.status === "DISCARDED");

  return (
    <div className={cn("space-y-2", isToday && "")}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "text-xs uppercase tracking-wider",
            isToday ? "text-ember-300 font-medium" : "text-muted-foreground",
          )}
        >
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground">{dateLabel}</div>
        <div className="h-px flex-1 bg-white/[0.04]" />
        {hasSent ? (
          <Badge variant="success" className="text-[9px]">
            Sent
          </Badge>
        ) : hasApproved ? (
          <Badge variant="gold" className="text-[9px]">
            Approved — will send {isToday ? "today" : "on this day"}
          </Badge>
        ) : hasPending ? (
          <Badge variant="outline" className="text-[9px]">
            Awaiting your review
          </Badge>
        ) : allDiscarded ? (
          <Badge variant="destructive" className="text-[9px]">
            Won't send
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px]">
            No draft yet
          </Badge>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-3 px-4 rounded border border-dashed border-white/[0.06]">
          No draft for this day yet — the daily cron tops the pipeline up each
          morning. Or click "Extra draft" above to generate one now.
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} isToday={isToday} />
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

function DraftCard({
  draft,
  isToday,
}: {
  draft: DraftRow;
  isToday: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text);
  const [pending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const r = await approveDraft(draft.id, editing ? text : undefined);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(
          isToday
            ? "Approved — will send shortly."
            : "Approved — will send on its day.",
        );
        setEditing(false);
      }
    });
  }

  function handleUnapprove() {
    startTransition(async () => {
      const r = await unapproveDraft(draft.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Moved back to pending.");
    });
  }

  function handleSendNow() {
    startTransition(async () => {
      const r = await sendDraft({
        draftId: draft.id,
        editedText: editing ? text : undefined,
      });
      if (!r.ok) toast.error(r.error);
      else toast.success("Sent to brotherhood.");
    });
  }

  function handleDiscard() {
    if (!confirm("Discard this draft? This day won't send anything.")) return;
    startTransition(async () => {
      const r = await discardDraft(draft.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Discarded.");
    });
  }

  function handleRegenerate() {
    startTransition(async () => {
      const r = await regenerateDraft(draft.id);
      if (!r.ok) toast.error(r.error);
      else toast.success("Regenerated.");
    });
  }

  const sent = draft.status === "SENT";
  const approved = draft.status === "APPROVED";
  const discarded = draft.status === "DISCARDED";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "rounded-lg border p-4 space-y-3",
        sent
          ? "border-emerald-500/20 bg-emerald-500/5"
          : approved
            ? "border-ember-500/30 bg-ember-500/[0.04]"
            : discarded
              ? "border-white/[0.04] bg-ink-900/30 opacity-60"
              : "border-white/[0.05] bg-ink-900/60",
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[10px]">
          {draft.theme && (
            <Badge variant="gold" className="text-[10px]">
              {draft.theme}
            </Badge>
          )}
          {draft.source !== "daily_reflection_cron" && (
            <Badge variant="outline" className="text-[10px]">
              {draft.source}
            </Badge>
          )}
        </div>
        {!sent && !discarded && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing((e) => !e)}
              disabled={pending}
              className="h-7 text-[11px]"
            >
              <Edit3 className="h-3 w-3" /> {editing ? "Cancel edit" : "Edit"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={pending}
              className="h-7 text-[11px]"
            >
              <RefreshCw className="h-3 w-3" /> Regenerate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={pending}
              className="h-7 text-[11px] text-muted-foreground hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {editing && !sent && !discarded ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 4096))}
          rows={8}
          className="font-mono text-xs"
        />
      ) : (
        <div
          className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap font-sans border-l-2 pl-3",
            sent
              ? "border-emerald-500/40 text-ivory/80"
              : approved
                ? "border-ember-500/50 text-ivory"
                : discarded
                  ? "border-white/[0.06] text-muted-foreground line-through"
                  : "border-ember-500/30 text-ivory",
          )}
        >
          {draft.text}
        </div>
      )}

      {!sent && !discarded && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {approved ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnapprove}
                disabled={pending}
              >
                <XCircle className="h-3.5 w-3.5" /> Unapprove
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendNow}
                disabled={pending}
              >
                <Send className="h-3.5 w-3.5" /> Send now instead
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendNow}
                disabled={pending}
              >
                <Send className="h-3.5 w-3.5" /> Send now
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={handleApprove}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {isToday ? "Approve & queue for today" : "Approve for this day"}
              </Button>
            </>
          )}
        </div>
      )}

      {sent && draft.text && (
        <div className="text-[10px] text-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Sent
        </div>
      )}
    </motion.div>
  );
}

function buildSevenDayWindow(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function groupByDay(drafts: DraftRow[]): Map<string, DraftRow[]> {
  const map = new Map<string, DraftRow[]>();
  for (const d of drafts) {
    const k = d.proposedFor ? dayKey(new Date(d.proposedFor)) : dayKey(new Date(d.createdAt));
    const arr = map.get(k) ?? [];
    arr.push(d);
    map.set(k, arr);
  }
  // Sort drafts within each day: PENDING/APPROVED first, SENT next, DISCARDED last
  const orderRank = { PENDING: 0, APPROVED: 1, SENT: 2, DISCARDED: 3 } as const;
  for (const [k, arr] of map.entries()) {
    arr.sort((a, b) => orderRank[a.status] - orderRank[b.status]);
    map.set(k, arr);
  }
  return map;
}

function dayKey(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}
