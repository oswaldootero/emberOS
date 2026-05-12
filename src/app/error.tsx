"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-5">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-ember-500/10 border border-ember-500/20">
          <Flame className="h-6 w-6 text-ember-300" />
        </div>
        <h1 className="font-display text-3xl text-ivory">
          The fire flickered.
        </h1>
        <p className="text-sm text-muted-foreground">
          Something interrupted the draw.{" "}
          {error.digest && (
            <span className="font-mono text-xs opacity-60">[{error.digest}]</span>
          )}
        </p>
        <Button variant="gold" onClick={reset}>
          Reignite
        </Button>
      </div>
    </div>
  );
}
