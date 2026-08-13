import { Badge } from "@/components/ui/badge";

export function InfluencerStageBadge({ stage }: { stage: string }) {
  const pretty = stage
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
  const variant =
    stage === "DECLINED" || stage === "INACTIVE"
      ? "outline"
      : stage === "ACTIVE_PARTNER"
        ? "success"
        : stage === "PROSPECT"
          ? "secondary"
          : "gold";
  return (
    <Badge variant={variant as "gold"} className="text-[10px]">
      {pretty}
    </Badge>
  );
}

/** 12400 → "12.4K", 1200000 → "1.2M" */
export function fmtFollowers(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}
