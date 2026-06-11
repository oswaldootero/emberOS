import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<
  string,
  "default" | "gold" | "secondary" | "outline" | "success" | "warning" | "destructive"
> = {
  LEAD: "outline",
  CONTACTED: "warning",
  SAMPLE_SENT: "gold",
  OPEN_ACCOUNT: "default",
  ACTIVE_CUSTOMER: "success",
  INACTIVE: "secondary",
  LOST: "destructive",
};

export function CustomerStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className="text-[10px]">
      {pretty(status)}
    </Badge>
  );
}

export function pretty(s: string): string {
  return s
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}
