"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ScoreBadge } from "./score-badge";
import type { ProspectListRow } from "@/server/prospecting";
import { setProspectStage } from "@/server/actions/prospects";

const STAGE_ORDER = [
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

const LABELS: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  CONTACTED: "Contacted",
  MEETING_SCHEDULED: "Meeting scheduled",
  MEETING_COMPLETED: "Meeting completed",
  SAMPLES_DELIVERED: "Samples delivered",
  NEGOTIATION: "Negotiation",
  FIRST_ORDER: "First order",
  ACTIVE_CUSTOMER: "Active customer",
  VIP_CUSTOMER: "VIP",
  LOST: "Lost",
};

/**
 * Pipeline board — horizontally scrolling stage columns. Cards move
 * left/right with arrow buttons (works on mobile too, no dnd library).
 */
export function ProspectBoard({
  byStage,
}: {
  byStage: Record<string, ProspectListRow[]>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function move(id: string, from: string, dir: -1 | 1) {
    const idx = STAGE_ORDER.indexOf(from as (typeof STAGE_ORDER)[number]);
    const next = STAGE_ORDER[idx + dir];
    if (!next) return;
    startTransition(async () => {
      const r = await setProspectStage(id, next);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto -mx-2 pb-2">
      <div className="flex gap-3 min-w-max px-2">
        {STAGE_ORDER.map((stage) => {
          const cards = byStage[stage] ?? [];
          return (
            <div key={stage} className="w-56 shrink-0">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {LABELS[stage]}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {cards.length}
                </span>
              </div>
              <div className="space-y-2 min-h-[60px] rounded-lg border border-white/[0.04] bg-ink-900/30 p-2">
                {cards.length === 0 && (
                  <div className="text-[10px] text-muted-foreground/50 italic text-center py-4">
                    empty
                  </div>
                )}
                {cards.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-md border border-white/[0.06] bg-ink-850 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/prospects/${p.id}`}
                        className="text-xs text-ivory hover:text-ember-200 leading-tight"
                      >
                        {p.businessName}
                      </Link>
                      <ScoreBadge score={p.aiScore} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => move(p.id, stage, -1)}
                        disabled={stage === "LEAD"}
                        className="p-1 rounded text-muted-foreground hover:text-ivory hover:bg-white/[0.05] disabled:opacity-20"
                        aria-label="Move to previous stage"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(p.id, stage, 1)}
                        disabled={stage === "LOST"}
                        className="p-1 rounded text-muted-foreground hover:text-ivory hover:bg-white/[0.05] disabled:opacity-20"
                        aria-label="Move to next stage"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
