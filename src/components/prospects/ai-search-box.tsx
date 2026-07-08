"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { aiProspectSearch } from "@/server/actions/prospects";

/**
 * Natural-language prospect search: "motorcycle-friendly lounges in FL
 * with high scores" → AI translates to filters → URL params.
 */
export function AiSearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();

  function run() {
    if (!q.trim()) return;
    startTransition(async () => {
      const r = await aiProspectSearch(q);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const f = r.filters;
      const params = new URLSearchParams();
      if (f.q) params.set("q", f.q);
      if (f.stage) params.set("stage", f.stage);
      if (f.state) params.set("state", f.state);
      if (f.city) params.set("city", f.city);
      if (f.minScore != null) params.set("minScore", String(f.minScore));
      if (f.verdict) params.set("verdict", f.verdict);
      if (f.dna.length) params.set("dna", f.dna.join(","));
      if (f.needsFollowUp) params.set("followup", "1");
      if (f.sort) params.set("sort", f.sort);
      toast.success(f.explanation);
      router.push(`/prospects?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-2 w-full max-w-xl">
      <div className="relative flex-1">
        <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ember-300" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder='Ask AI: "best motorcycle-friendly lounges in Florida"…'
          className="pl-8 h-9 text-xs"
        />
      </div>
      <Button variant="outline" size="sm" onClick={run} disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
      </Button>
    </div>
  );
}
