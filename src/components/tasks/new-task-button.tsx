import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

type Ctx = {
  customer?: string;
  prospect?: string;
  influencer?: string;
  sale?: string;
  title?: string;
  tag?: string;
  due?: string;
};

export function newTaskHref(ctx: Ctx = {}): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(ctx)) if (v) sp.set(k, v);
  const q = sp.toString();
  return q ? `/tasks/new?${q}` : "/tasks/new";
}

/** "New task" link pre-filled with the record it's about. Same look everywhere. */
export function NewTaskButton({ ctx, label = "New task", variant = "outline", className }: { ctx?: Ctx; label?: string; variant?: "outline" | "gold" | "ghost"; className?: string }) {
  return (
    <Button variant={variant} size="sm" asChild className={className}>
      <Link href={newTaskHref(ctx)}>
        <CheckSquare className="h-4 w-4" /> {label}
      </Link>
    </Button>
  );
}
