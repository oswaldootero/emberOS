"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IcpScoreBadge, ScoreBadge, StageBadge } from "./score-badge";
import { icpTier } from "@/lib/icp";
import type { ProspectListRow } from "@/server/prospecting";
import {
  batchAnalyzeProspects,
  bulkDeleteProspects,
  setProspectStage,
} from "@/server/actions/prospects";

const STAGE_OPTIONS = [
  "LEAD",
  "QUALIFIED",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "MEETING_COMPLETED",
  "SAMPLES_DELIVERED",
  "NEGOTIATION",
  "FIRST_ORDER",
  "ACTIVE_CUSTOMER",
  "VIP_CUSTOMER",
  "LOST",
] as const;

const prettyStage = (s: string) =>
  s.toLowerCase().split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

export function ProspectListClient({
  rows,
  isAdmin,
  unanalyzedCount,
}: {
  rows: ProspectListRow[];
  isAdmin: boolean;
  unanalyzedCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function runBulkDelete() {
    const ids = Array.from(selected);
    if (!confirm(`Permanently delete ${ids.length} prospect${ids.length === 1 ? "" : "s"}?`)) return;
    startTransition(async () => {
      const r = await bulkDeleteProspects(ids);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`${r.id} deleted.`);
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  // Repeatedly call the batch endpoint (5 per call) until none remain.
  async function runBatchAnalysis() {
    setBatchRunning(true);
    setBatchDone(0);
    try {
      let remaining = unanalyzedCount;
      let doneTotal = 0;
      while (remaining > 0) {
        const r = await batchAnalyzeProspects(5);
        if (!r.ok) {
          toast.error(r.error);
          break;
        }
        doneTotal += r.processed;
        setBatchDone(doneTotal);
        if (r.failed > 0 && r.processed === 0) {
          toast.error("AI analysis is failing — check the OpenAI configuration.");
          break;
        }
        remaining = r.remaining;
      }
      if (doneTotal > 0) toast.success(`Scored ${doneTotal} prospect${doneTotal === 1 ? "" : "s"}.`);
      router.refresh();
    } finally {
      setBatchRunning(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 py-2 border-b border-white/[0.05] flex-wrap">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() =>
            setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
          }
          aria-label="Select all prospects on this page"
          className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
        />
        {selected.size > 0 ? (
          <>
            <span className="text-[11px] text-ivory">{selected.size} selected</span>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={runBulkDelete}
                className="text-red-300 hover:text-red-200 border-red-500/30"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-muted-foreground">
              <X className="h-3 w-3" /> Clear
            </Button>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Select prospects for bulk actions
          </span>
        )}
        {unanalyzedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={batchRunning}
            onClick={() => void runBatchAnalysis()}
          >
            {batchRunning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Scoring… {batchDone}/{unanalyzedCount}
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-ember-300" />
                Run AI on {unanalyzedCount} unscored
              </>
            )}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[960px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
              <th className="py-2 px-2 w-8" />
              <th className="text-left font-normal py-2 px-2">ICP</th>
              <th className="text-left font-normal py-2 px-2">AI</th>
              <th className="text-left font-normal py-2 px-2">Business</th>
              <th className="text-left font-normal py-2 px-2 hidden md:table-cell">Location</th>
              <th className="text-left font-normal py-2 px-2">Stage</th>
              <th className="text-left font-normal py-2 px-2 hidden lg:table-cell">Rep</th>
              <th className="text-left font-normal py-2 px-2 hidden lg:table-cell">Last visit</th>
              <th className="text-left font-normal py-2 px-2 hidden md:table-cell">Follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition">
                <td className="py-2.5 px-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={(e) => toggle(p.id, e.target.checked)}
                    aria-label={`Select ${p.businessName}`}
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <div className="space-y-0.5">
                    <IcpScoreBadge score={p.icpScore} />
                    {p.icpScore != null && (
                      <div className={`text-[9px] whitespace-nowrap ${icpTier(p.icpScore).textClass}`}>
                        {icpTier(p.icpScore).rating}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <ScoreBadge score={p.aiScore} />
                </td>
                <td className="py-2.5 px-2">
                  <Link href={`/prospects/${p.id}`} className="text-ivory hover:text-ember-200">
                    {p.businessName}
                  </Link>
                  <div className="text-[10px] text-muted-foreground">
                    {p.businessType ?? "—"}
                    {p.googleRating != null && ` · ★ ${p.googleRating}`}
                    {p.customerId && " · converted"}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">
                  {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="py-2.5 px-2">
                  <Select
                    value={p.stage}
                    onValueChange={(v) =>
                      startTransition(async () => {
                        const r = await setProspectStage(p.id, v as "LEAD");
                        if (!r.ok) toast.error(r.error);
                        else router.refresh();
                      })
                    }
                  >
                    <SelectTrigger className="border-0 bg-transparent h-auto p-0 shadow-none w-fit gap-1 hover:opacity-80">
                      <SelectValue asChild>
                        <span><StageBadge stage={p.stage} /></span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{prettyStage(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden lg:table-cell max-w-[130px] truncate">
                  {p.assignedTo ?? "—"}
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden lg:table-cell">
                  {p.lastVisitDate
                    ? new Date(p.lastVisitDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">
                  {p.nextFollowupDate
                    ? new Date(p.nextFollowupDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
