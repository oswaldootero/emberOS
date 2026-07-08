"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightCircle, Edit3, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageBadge } from "./score-badge";
import {
  analyzeProspect,
  convertProspectToCustomer,
  enrichProspect,
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

export function ProspectProfileActions({
  prospectId,
  stage,
  hasAnalysis,
  customerId,
}: {
  prospectId: string;
  stage: string;
  hasAnalysis: boolean;
  customerId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    fn: () => Promise<{ ok: boolean } & Record<string, unknown>>,
    success: string,
    after?: (r: { ok: true; id: string }) => void,
  ) {
    startTransition(async () => {
      const r = (await fn()) as { ok: boolean; id?: string; error?: string };
      if (!r.ok) {
        toast.error(r.error ?? "Failed.");
        return;
      }
      toast.success(success);
      after?.(r as { ok: true; id: string });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={stage}
        onValueChange={(v) =>
          run(() => setProspectStage(prospectId, v as "LEAD"), "Stage updated.")
        }
      >
        <SelectTrigger className="border-0 bg-transparent h-auto p-0 shadow-none w-fit gap-1 hover:opacity-80">
          <SelectValue asChild>
            <span><StageBadge stage={stage} /></span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STAGE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>{prettyStage(s)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => run(() => enrichProspect(prospectId), "Enriched — blanks filled where AI recognized the business.")}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        AI enrich
      </Button>

      <Button
        variant="gold"
        size="sm"
        disabled={pending}
        onClick={() => run(() => analyzeProspect(prospectId), "Analysis complete.")}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {hasAnalysis ? "Re-run AI analysis" : "Run AI analysis"}
      </Button>

      {customerId ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/crm/${customerId}`}>
            <ArrowRightCircle className="h-3.5 w-3.5" /> View customer
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            confirm("Convert this prospect into a CRM customer?") &&
            run(
              () => convertProspectToCustomer(prospectId),
              "Converted — customer created.",
              (r) => router.push(`/crm/${r.id}`),
            )
          }
        >
          <ArrowRightCircle className="h-3.5 w-3.5" /> Convert to customer
        </Button>
      )}

      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href={`/prospects/${prospectId}/edit`}>
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </Link>
      </Button>
    </div>
  );
}
