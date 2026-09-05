import Link from "next/link";
import {
  AtSign,
  Briefcase,
  CheckSquare,
  ChevronRight,
  Hash,
  Megaphone,
  Package,
  Receipt,
  RotateCcw,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActionItem, ActionKind, Urgency } from "@/server/dashboard/today-logic";

const ICON: Record<ActionKind, LucideIcon> = {
  invoice: Receipt,
  customer: Briefcase,
  prospect: Target,
  task: CheckSquare,
  influencer: Megaphone,
  reorder: RotateCcw,
  mention: AtSign,
  stock: Package,
  social: Hash,
};

const URGENCY: Record<Urgency, { label: string; variant: "destructive" | "warning" | "outline" | "secondary" }> = {
  overdue: { label: "Overdue", variant: "destructive" },
  today: { label: "Today", variant: "warning" },
  soon: { label: "This week", variant: "outline" },
  info: { label: "When you can", variant: "secondary" },
};

export function TodayActions({ items, overflow }: { items: ActionItem[]; overflow: number }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Nothing is waiting on you. Go find a new account or two.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/[0.04]">
      {items.map((a) => {
        const Icon = ICON[a.kind];
        const u = URGENCY[a.urgency];
        return (
          <li key={a.id}>
            <Link
              href={a.href}
              className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-md hover:bg-white/[0.03] transition-colors group"
            >
              <span
                className={cn(
                  "h-8 w-8 shrink-0 rounded-md border flex items-center justify-center",
                  a.urgency === "overdue"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : a.urgency === "today"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      : "border-white/[0.08] bg-ink-900/40 text-ember-300",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-ivory truncate">{a.title}</span>
                {a.detail && <span className="block text-[11px] text-muted-foreground truncate">{a.detail}</span>}
              </span>
              <Badge variant={u.variant} className="text-[9px] shrink-0 hidden sm:inline-flex">{u.label}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 shrink-0" />
            </Link>
          </li>
        );
      })}
      {overflow > 0 && (
        <li className="pt-2 text-[11px] text-muted-foreground">and {overflow} more — open the pages above to see everything.</li>
      )}
    </ul>
  );
}
