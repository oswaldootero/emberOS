import { Badge } from "@/components/ui/badge";

const VARIANT: Record<
  string,
  "default" | "gold" | "secondary" | "outline" | "success" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "destructive",
  DISCONTINUED: "outline",
};

export function InventoryStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT[status] ?? "outline"} className="text-[10px]">
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
