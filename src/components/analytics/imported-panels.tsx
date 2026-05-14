"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, compactNumber, relativeTime } from "@/lib/utils";
import type { ImportedSnapshot } from "@/server/analytics/imports";

const SOURCE_LABELS: Record<string, string> = {
  GA4: "Google Analytics",
  GSC: "Search Console",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  EMAIL: "Email",
  CUSTOM: "Custom",
};

export function ImportedDataPanels({
  imports,
}: {
  imports: ImportedSnapshot[];
}) {
  if (imports.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center space-y-3">
          <UploadCloud className="h-7 w-7 text-ember-300 mx-auto opacity-60" />
          <div className="text-sm text-ivory">
            No external analytics imported yet.
          </div>
          <div className="text-xs text-muted-foreground">
            Export a CSV from Google Analytics, Search Console, Meta Business
            Suite, or YouTube Studio. EmberOS parses it and reports what's
            working.
          </div>
          <Button variant="gold" size="sm" asChild>
            <Link href="/analytics/import">
              <UploadCloud className="h-4 w-4" /> Import Your First CSV
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group by source for distinct cards
  const bySource = imports.reduce<Record<string, ImportedSnapshot[]>>(
    (acc, imp) => {
      acc[imp.source] = acc[imp.source] ?? [];
      acc[imp.source].push(imp);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <AIInsightsPanel snapshotCount={imports.length} />
      <div className="grid lg:grid-cols-2 gap-6">
        {Object.entries(bySource).map(([source, snaps]) => (
          <SourcePanel key={source} source={source} snapshots={snaps} />
        ))}
      </div>
    </div>
  );
}

function AIInsightsPanel({ snapshotCount }: { snapshotCount: number }) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const r = await fetch("/api/ai/insights", { method: "POST" });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error ?? "Failed");
      setInsights(json.markdown);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-ember-glow opacity-50 pointer-events-none" />
      <CardHeader className="relative flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-ember-300" /> What's working,
            what's not
          </CardTitle>
          <CardDescription>
            AI-generated review of your latest analytics imports. Reads all{" "}
            {snapshotCount} reports and tells you in plain English.
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
          ) : insights ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Analyzing…" : insights ? "Refresh" : "Generate insights"}
        </Button>
      </CardHeader>
      <AnimatePresence>
        {insights && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <CardContent>
              <div className="prose prose-invert prose-sm max-w-none">
                <RenderedMarkdown md={insights} />
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**
 * Minimal markdown renderer — enough for the insight format we ask for.
 * Avoids pulling in a full markdown library on the client.
 */
function RenderedMarkdown({ md }: { md: string }) {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let listBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length > 0) {
      out.push(
        <ul key={`l-${out.length}`} className="space-y-1.5 my-3">
          {listBuffer.map((item, i) => (
            <li
              key={i}
              className="text-sm text-ivory pl-4 relative before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-ember-300"
            >
              {inline(item)}
            </li>
          ))}
        </ul>,
      );
      listBuffer = [];
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      flushList();
      out.push(
        <h3
          key={i}
          className="font-display text-lg text-gold mt-5 first:mt-0 mb-2"
        >
          {line.replace(/^##\s+/, "")}
        </h3>,
      );
    } else if (/^[-*]\s+/.test(line.trim())) {
      listBuffer.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim().length > 0) {
      flushList();
      out.push(
        <p key={i} className="text-sm text-ivory/90 my-2 leading-relaxed">
          {inline(line)}
        </p>,
      );
    } else {
      flushList();
    }
  }
  flushList();
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

function SourcePanel({
  source,
  snapshots,
}: {
  source: string;
  snapshots: ImportedSnapshot[];
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const snap = snapshots[activeIdx];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-ember-300" />
            {SOURCE_LABELS[source] ?? source}
          </CardTitle>
          {snapshots.length > 1 && (
            <div className="flex items-center gap-1">
              {snapshots.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    "text-[10px] rounded px-2 py-0.5 transition",
                    i === activeIdx
                      ? "bg-ember-500/15 text-ember-200"
                      : "text-muted-foreground hover:text-ivory",
                  )}
                >
                  {s.reportType.split("_").slice(-1)[0]}
                </button>
              ))}
            </div>
          )}
        </div>
        <CardDescription className="text-[11px]">
          {snap.label ?? snap.filename} · {snap.rowCount} rows ·{" "}
          {relativeTime(snap.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {snap.warnings.length > 0 && (
          <div className="text-[10px] text-amber-300 flex gap-1.5 items-center">
            <ShieldAlert className="h-3 w-3" />
            {snap.warnings.join("; ")}
          </div>
        )}
        <TotalsGrid totals={snap.totals} />
        {snap.topEntities.length > 0 && (
          <TopEntitiesTable entities={snap.topEntities} />
        )}
      </CardContent>
    </Card>
  );
}

function TotalsGrid({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals).filter(([, v]) => typeof v === "number");
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {entries.slice(0, 8).map(([key, value]) => (
        <div
          key={key}
          className="rounded-md border border-white/[0.05] bg-ink-900/40 p-2.5"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
            {prettyKey(key)}
          </div>
          <div className="font-display text-xl text-ivory tabular-nums">
            {formatMetric(key, value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopEntitiesTable({
  entities,
}: {
  entities: Array<Record<string, string | number>>;
}) {
  // Pick the first 5 entities, with the first string col as label and
  // the next 2-3 numeric cols as metrics
  const keys = Object.keys(entities[0] ?? {});
  const labelKey =
    keys.find((k) => typeof entities[0][k] === "string") ?? keys[0];
  const numericKeys = keys.filter((k) => typeof entities[0][k] === "number").slice(0, 3);

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Top performers
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {entities.slice(0, 6).map((e, i) => (
          <li key={i} className="py-1.5 flex items-center gap-3 text-sm">
            <span className="w-4 text-xs text-muted-foreground font-mono">
              {i + 1}.
            </span>
            {e.permalink ? (
              <a
                href={String(e.permalink)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 truncate text-ivory hover:text-ember-200 inline-flex items-center gap-1"
              >
                {String(e[labelKey] ?? "")}
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
              </a>
            ) : (
              <span className="flex-1 truncate text-ivory">
                {String(e[labelKey] ?? "")}
              </span>
            )}
            {numericKeys.map((k) => (
              <span
                key={k}
                className="text-[10px] text-muted-foreground tabular-nums shrink-0"
              >
                <span className="opacity-60">{prettyKey(k)}</span>{" "}
                <span className="text-ivory">
                  {formatMetric(k, Number(e[k] ?? 0))}
                </span>
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

function prettyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/Ctr/g, "CTR")
    .trim();
}

function formatMetric(key: string, value: number): string {
  if (key.toLowerCase().includes("rate") || key.toLowerCase().includes("ctr")) {
    return `${(value < 1 ? value * 100 : value).toFixed(2)}%`;
  }
  if (key.toLowerCase().includes("position")) {
    return value.toFixed(1);
  }
  return compactNumber(value);
}
