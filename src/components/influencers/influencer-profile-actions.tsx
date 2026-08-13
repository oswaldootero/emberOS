"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  bulkDeleteInfluencers,
  setInfluencerStage,
} from "@/server/actions/influencers";

const STAGE_OPTIONS = [
  "PROSPECT",
  "CONTACTED",
  "IN_CONVERSATION",
  "AGREED",
  "CIGARS_SENT",
  "ACTIVE_PARTNER",
  "INACTIVE",
  "DECLINED",
] as const;

const prettyStage = (s: string) =>
  s.toLowerCase().split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

export function InfluencerProfileActions({
  influencerId,
  name,
  stage,
  isAdmin,
}: {
  influencerId: string;
  name: string;
  stage: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStage(v: string) {
    startTransition(async () => {
      const r = await setInfluencerStage(influencerId, v as "PROSPECT");
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`Stage → ${prettyStage(v)}`);
        router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm(`Permanently delete ${name}? Their shipment and post history goes too.`)) return;
    startTransition(async () => {
      const r = await bulkDeleteInfluencers([influencerId]);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Deleted.");
        router.push("/influencers");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={stage} onValueChange={changeStage} disabled={pending}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGE_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>{prettyStage(s)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/influencers/${influencerId}/edit`}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
      </Button>
      {isAdmin && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={remove}
          className="text-red-300 hover:text-red-200 border-red-500/30"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </Button>
      )}
    </div>
  );
}
