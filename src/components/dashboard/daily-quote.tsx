"use client";

import { useState } from "react";
import { Check, Copy, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Quote } from "@/server/motivation/quotes";

const TEAM_LABEL: Record<NonNullable<Quote["team"]>, string> = {
  dolphins: "Dolphins",
  hurricanes: "Hurricanes",
};

/** Today's motivational line on the Today board. Same quote the morning push sends. */
export function DailyQuote({ quote }: { quote: Quote }) {
  const [copied, setCopied] = useState(false);
  const attribution = quote.role ? `${quote.author}, ${quote.role}` : quote.author;
  const line = `“${quote.text}” — ${attribution}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (http / permissions) — nothing to do */
    }
  }

  return (
    <Card className="border-ember-500/20 bg-ember-500/[0.04]">
      <CardContent className="py-4 flex items-start gap-3">
        <Flame className="h-4 w-4 text-ember-300 mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Today&apos;s fuel{quote.team ? ` · ${TEAM_LABEL[quote.team]}` : ""}
          </div>
          <p className="font-display text-lg leading-snug text-ivory">&ldquo;{quote.text}&rdquo;</p>
          <p className="text-xs text-muted-foreground mt-1">&mdash; {attribution}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy quote"
          className="p-1.5 -m-1 rounded-md text-muted-foreground hover:text-ivory hover:bg-white/[0.04] transition-colors shrink-0"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </CardContent>
    </Card>
  );
}
