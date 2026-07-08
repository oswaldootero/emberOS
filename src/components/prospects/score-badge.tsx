import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-[10px] text-muted-foreground italic">unscored</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-7 w-9 rounded-md text-xs font-semibold tabular-nums border",
        score >= 75
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : score >= 50
            ? "border-ember-500/40 bg-ember-500/10 text-ember-200"
            : "border-white/15 bg-white/[0.04] text-muted-foreground",
      )}
      title={`Heaven's Leaf compatibility: ${score}/100`}
    >
      {score}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const v: Record<string, "success" | "warning" | "outline"> = {
    PURSUE: "success",
    MAYBE: "warning",
    SKIP: "outline",
  };
  return (
    <Badge variant={v[verdict] ?? "outline"} className="text-[10px]">
      {verdict.toLowerCase()}
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const pretty = stage
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
  const variant =
    stage === "LOST"
      ? "outline"
      : stage === "ACTIVE_CUSTOMER" || stage === "VIP_CUSTOMER" || stage === "FIRST_ORDER"
        ? "success"
        : stage === "LEAD"
          ? "secondary"
          : "gold";
  return (
    <Badge variant={variant as "gold"} className="text-[10px]">
      {pretty}
    </Badge>
  );
}
