import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, compactNumber } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  delta?: number; // percent
  icon: LucideIcon;
  hint?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  const display = typeof value === "number" ? compactNumber(value) : value;

  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute inset-0 bg-ember-glow opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="relative p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4 text-ember-300/80" />
            <span className="text-xs uppercase tracking-wider">{label}</span>
          </div>
          {typeof delta === "number" && (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
                positive
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-red-500/10 text-red-300",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="font-display text-3xl md:text-4xl tracking-tight text-ivory">
          {display}
        </div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
