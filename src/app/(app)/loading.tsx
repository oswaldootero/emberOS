import { Flame } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <Flame className="h-6 w-6 text-ember-300 mx-auto animate-glow" />
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Lighting the ember…
        </div>
      </div>
    </div>
  );
}
