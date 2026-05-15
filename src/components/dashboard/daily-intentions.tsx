"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "emberos.daily-intentions";

type Cached = {
  markdown: string;
  generatedAt: string;
  hasData: boolean;
};

export function DailyIntentions() {
  const [cached, setCached] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(false);

  // Restore today's intentions if already generated this calendar day
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Cached;
      const sameDay =
        new Date(parsed.generatedAt).toDateString() ===
        new Date().toDateString();
      if (sameDay) setCached(parsed);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  async function generate() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/daily-intentions", { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error ?? "Generation failed");
      const next: Cached = {
        markdown: json.markdown,
        generatedAt: json.generatedAt,
        hasData: json.hasData,
      };
      setCached(next);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-ember-glow opacity-50 pointer-events-none" />
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-ember-500/10 blur-3xl pointer-events-none" />
      <CardHeader className="relative flex flex-row items-start justify-between">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-ember-300/80">
            {today}
          </div>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-ember-300" /> Today's intentions
          </CardTitle>
          <CardDescription>
            Daily gap analysis tailored to a boutique cigar brand. Depth over
            volume. Specific moves you can make today.
          </CardDescription>
        </div>
        <Button
          variant="gold"
          size="sm"
          onClick={generate}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : cached ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading
            ? "Reading the smoke…"
            : cached
              ? "Refresh"
              : "Generate today's intentions"}
        </Button>
      </CardHeader>
      <AnimatePresence>
        {cached && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CardContent className="relative">
              <div className="prose prose-invert prose-sm max-w-none">
                <RenderedMarkdown md={cached.markdown} />
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground italic">
                Generated{" "}
                {new Date(cached.generatedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {cached.hasData
                  ? " · based on your latest imports"
                  : " · no analytics imports yet, intentions are foundational"}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
      {!cached && !loading && (
        <CardContent className="relative">
          <div className="text-sm text-muted-foreground italic max-w-2xl">
            Click <span className="text-ember-200">Generate today's intentions</span>{" "}
            and the AI will read your latest imports, factor in what day of
            the week it is, and recommend 3-5 specific things you can do today
            to deepen brotherhood engagement. Costs about $0.02 per
            generation.
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Minimal markdown renderer — bold, italics, headings, numbered lists.
 * Avoids pulling a full markdown library on the client.
 */
function RenderedMarkdown({ md }: { md: string }) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let numberedBuffer: string[] = [];

  function flushNumberedList() {
    if (numberedBuffer.length > 0) {
      out.push(
        <ol key={`n-${out.length}`} className="space-y-2.5 my-3 list-none">
          {numberedBuffer.map((item, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm text-ivory leading-relaxed"
            >
              <span className="h-6 w-6 rounded-full bg-ember-500/15 border border-ember-500/30 flex items-center justify-center text-[11px] font-mono text-ember-200 shrink-0">
                {i + 1}
              </span>
              <span>{inline(item)}</span>
            </li>
          ))}
        </ol>,
      );
      numberedBuffer = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      flushNumberedList();
      out.push(
        <h3
          key={i}
          className="font-display text-lg text-gold mt-5 first:mt-0 mb-2"
        >
          {line.replace(/^##\s+/, "")}
        </h3>,
      );
    } else if (/^\d+\.\s+/.test(line.trim())) {
      numberedBuffer.push(line.replace(/^\s*\d+\.\s+/, ""));
    } else if (line.trim().length > 0) {
      flushNumberedList();
      out.push(
        <p key={i} className="text-sm text-ivory/90 my-2 leading-relaxed">
          {inline(line)}
        </p>,
      );
    } else {
      flushNumberedList();
    }
  }
  flushNumberedList();
  return <>{out}</>;
}

function inline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|_(.+?)_|`(.+?)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1])
      parts.push(
        <strong key={m.index} className="text-ember-200">
          {m[1]}
        </strong>,
      );
    else if (m[2])
      parts.push(
        <em key={m.index} className="italic">
          {m[2]}
        </em>,
      );
    else if (m[3])
      parts.push(
        <code key={m.index} className="text-ember-200 text-xs">
          {m[3]}
        </code>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
