"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
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
import { relativeTime } from "@/lib/utils";
import {
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
  createdAt: string;
  parseMode: string;
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
      toast.success("Fresh draft ready below.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ember-300" />
            Drafts awaiting your eyes
          </CardTitle>
          <CardDescription>
            AI proposes, you curate. Nothing posts automatically.{" "}
            {drafts.length === 0
              ? "Nothing pending — generate one below or wait for the daily cron."
              : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} ready.`}
          </CardDescription>
        </div>
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
          New draft
        </Button>
      </CardHeader>
      <CardContent>
        {drafts.length === 0 ? (
          <div className="text-sm text-muted-foreground italic py-6 text-center">
            No pending drafts. The daily cron generates 3 fresh ones each
            morning — or click "New draft" to make one now.
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {drafts.map((d) => (
                <DraftCard key={d.id} draft={d} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DraftCard({ draft }: { draft: DraftRow }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(draft.text);
  const [pending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const r = await sendDraft({ draftId: draft.id, editedText: editing ? text : undefined });
      if (!r.ok) toast.error(r.error);
      else toast.success(r.externalUrl ? "Sent." : "Sent to the brotherhood.");
    });
  }

  function handleDiscard() {
    if (!confirm("Discard this draft?")) return;
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
      else {
        toast.success("Regenerated. Pull to refresh if it still shows the old text.");
        setText(""); // force display from server on next render
        setEditing(false);
      }
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[10px]">
          {draft.theme && (
            <Badge variant="gold" className="text-[10px]">
              {draft.theme}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            {draft.source === "daily_reflection_cron" ? "daily" : draft.source}
          </Badge>
          <span className="text-muted-foreground">
            drafted {relativeTime(draft.createdAt)}
          </span>
        </div>
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
      </div>

      {editing ? (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 4096))}
          rows={8}
          className="font-mono text-xs"
        />
      ) : (
        <div className="text-sm text-ivory leading-relaxed whitespace-pre-wrap font-sans border-l-2 border-ember-500/30 pl-3">
          {draft.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="gold"
          size="sm"
          onClick={handleSend}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {editing ? "Send edited" : "Send to brotherhood"}
        </Button>
      </div>
    </motion.div>
  );
}
