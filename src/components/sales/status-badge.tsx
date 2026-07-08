import { Badge } from "@/components/ui/badge";

const VARIANT: Record<
  string,
  "default" | "gold" | "secondary" | "outline" | "success" | "warning" | "destructive"
> = {
  DRAFT: "secondary",
  SENT: "gold",
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "destructive",
  CANCELLED: "outline",
};

export function SaleStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANT[status] ?? "outline"} className="text-[10px]">
      {status === "CANCELLED" ? "Void" : pretty(status)}
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
