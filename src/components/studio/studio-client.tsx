"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Wand2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { setWordPressHandoff, consumeStudioHandoff } from "@/lib/handoff";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ContentTypeKey } from "@/server/ai/prompt-templates";

type Template = {
  key: ContentTypeKey;
  label: string;
  description: string;
};

const EMOTIONAL_TONES = [
  "reverent",
  "warm",
  "rugged",
  "contemplative",
  "intimate",
] as const;

const PLATFORMS = [
  "instagram",
  "facebook",
  "telegram",
  "youtube",
  "x_twitter",
  "wordpress",
  "email",
] as const;

export function StudioClient({ templates }: { templates: Template[] }) {
  const [type, setType] = useState<ContentTypeKey>("caption");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>("instagram");
  const [emotionalTone, setEmotionalTone] =
    useState<(typeof EMOTIONAL_TONES)[number]>("contemplative");
  const [wordCount, setWordCount] = useState([600]);
  const [reflection, setReflection] = useState([60]);
  const [brotherhood, setBrotherhood] = useState([70]);
  const [cinematic, setCinematic] = useState([80]);
  const [spirituality, setSpirituality] = useState([40]);
  const [ctaIntensity, setCtaIntensity] =
    useState<"none" | "soft" | "medium">("soft");
  const [brandNotes, setBrandNotes] = useState("");

  const [output, setOutput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [safety, setSafety] = useState<{
    score: number;
    badge: "safe" | "watch" | "risky";
    flags: { flag: string; severity: string; suggestion: string }[];
  } | null>(null);
  const [inspiredBy, setInspiredBy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Consume Studio handoff from /analytics on mount — pre-fill topic
  // with a proven top performer as creative inspiration.
  useEffect(() => {
    const h = consumeStudioHandoff();
    if (!h) return;
    setTopic(
      `Write in the spirit of this proven piece — keep its tone and theme, but make it fresh:\n\n"${h.inspiration}"`,
    );
    setInspiredBy(h.sourceLabel);
    if (h.suggestedType) setType(h.suggestedType as ContentTypeKey);
  }, []);

  // Run safety analysis on output (debounced)
  useEffect(() => {
    if (!output || isStreaming) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/ai/safety", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: output }),
        });
        if (r.ok) setSafety(await r.json());
      } catch {
        // ignore
      }
    }, 600);
    return () => clearTimeout(t);
  }, [output, isStreaming]);

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("Add a topic or seed thought first.");
      return;
    }
    setOutput("");
    setSafety(null);
    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          type,
          topic,
          platform,
          wordCount: wordCount[0],
          emotionalTone,
          ctaIntensity,
          tone: {
            reflection: reflection[0],
            brotherhood: brotherhood[0],
            cinematic: cinematic[0],
            spirituality: spirituality[0],
          },
          brandVoiceNotes: brandNotes || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message ?? "Generation failed");
      }
    } finally {
      setIsStreaming(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard.");
  }

  const router = useRouter();

  function sendToWordPress() {
    if (!output) return;
    // Heuristic: derive a title from the first non-empty line, strip markdown #s
    const firstLine = output
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
    const derivedTitle = firstLine.replace(/^#+\s*/, "").slice(0, 200);

    setWordPressHandoff({
      title: derivedTitle,
      body: output,
      bodyFormat:
        type === "blog_post" || type === "seo_article" || type === "devotional"
          ? "markdown"
          : "markdown",
      excerpt: topic.slice(0, 200),
      yoastFocusKeyword:
        type === "seo_article" ? topic.split(/\s+/).slice(0, 4).join(" ") : undefined,
    });
    router.push("/wordpress/new");
  }

  const isLongForm =
    type === "blog_post" ||
    type === "seo_article" ||
    type === "devotional" ||
    type === "email_newsletter";

  return (
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-ember-300" />
            Generation Controls
          </CardTitle>
          <CardDescription>Shape the voice before you strike the match.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Content type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ContentTypeKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    <div className="flex flex-col">
                      <span>{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {t.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Topic / seed thought</Label>
            {inspiredBy && (
              <div className="flex items-start gap-2 rounded-md border border-ember-500/30 bg-ember-500/5 p-2 text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-ember-300 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-ember-200 font-medium">
                    Inspired by your top performer
                  </div>
                  <div className="text-muted-foreground">{inspiredBy}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInspiredBy(null);
                    setTopic("");
                  }}
                  className="text-muted-foreground hover:text-ivory text-[10px] underline"
                >
                  clear
                </button>
              </div>
            )}
            <Textarea
              placeholder="e.g. The first cigar I shared with my father after he forgave me"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={inspiredBy ? 6 : 3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as typeof platform)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.replace("_", "/")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Emotional tone</Label>
              <Select
                value={emotionalTone}
                onValueChange={(v) =>
                  setEmotionalTone(v as typeof emotionalTone)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMOTIONAL_TONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <ToneSlider label="Reflection" value={reflection} setValue={setReflection} />
            <ToneSlider
              label="Brotherhood"
              value={brotherhood}
              setValue={setBrotherhood}
            />
            <ToneSlider label="Cinematic" value={cinematic} setValue={setCinematic} />
            <ToneSlider
              label="Spirituality"
              value={spirituality}
              setValue={setSpirituality}
            />
          </div>

          {(type === "blog_post" || type === "seo_article") && (
            <div className="space-y-2">
              <Label>Target word count: {wordCount[0]}</Label>
              <Slider
                value={wordCount}
                onValueChange={setWordCount}
                min={200}
                max={2500}
                step={100}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>CTA intensity</Label>
            <Select
              value={ctaIntensity}
              onValueChange={(v) => setCtaIntensity(v as typeof ctaIntensity)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Extra voice notes (optional)</Label>
            <Input
              placeholder="e.g. Reference this Sunday's ride to the coast"
              value={brandNotes}
              onChange={(e) => setBrandNotes(e.target.value)}
            />
          </div>

          {isStreaming ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancel}
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Cancel
            </Button>
          ) : (
            <Button variant="gold" className="w-full" onClick={handleGenerate}>
              <Sparkles className="h-4 w-4" /> Strike the Match
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Output */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-ember-glow opacity-40 pointer-events-none" />
        <CardHeader className="relative flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles
                className={`h-4 w-4 ${
                  isStreaming ? "text-ember-300 animate-glow" : "text-ember-300"
                }`}
              />
              Output
            </CardTitle>
            <CardDescription>
              {isStreaming
                ? "Drawing the smoke…"
                : output
                  ? "Generated. Review, then schedule or save."
                  : "Awaiting a spark."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {safety && <SafetyBadge safety={safety} />}
            {output && isLongForm && (
              <Button
                variant="gold"
                size="sm"
                onClick={sendToWordPress}
                disabled={isStreaming}
              >
                <Globe className="h-3.5 w-3.5" /> Send to WordPress
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!output}
              onClick={copyOutput}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="min-h-[420px] rounded-lg border border-white/[0.05] bg-ink-900/70 p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-ivory-50">
            {output || (
              <div className="text-muted-foreground italic font-display text-base">
                The page is empty for now. That's part of the ritual.
              </div>
            )}
            {isStreaming && (
              <span className="inline-block h-4 w-1 align-middle bg-ember-300 animate-glow ml-1" />
            )}
          </div>

          <AnimatePresence>
            {safety && safety.flags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2"
              >
                <div className="text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Safety review · {safety.flags.length} flag
                  {safety.flags.length === 1 ? "" : "s"}
                </div>
                <ul className="space-y-1.5">
                  {safety.flags.slice(0, 5).map((f, i) => (
                    <li key={i} className="text-xs text-ivory/80">
                      <span className="text-amber-300">[{f.severity}]</span>{" "}
                      <span className="font-medium">{f.flag}</span> —{" "}
                      <span className="text-muted-foreground">{f.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

function ToneSlider({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number[];
  setValue: (v: number[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="font-mono text-ember-200">{value[0]}</span>
      </div>
      <Slider value={value} onValueChange={setValue} min={0} max={100} step={5} />
    </div>
  );
}

function SafetyBadge({
  safety,
}: {
  safety: { score: number; badge: "safe" | "watch" | "risky" };
}) {
  if (safety.badge === "safe")
    return (
      <Badge variant="success" className="gap-1">
        <ShieldCheck className="h-3 w-3" /> Safe
      </Badge>
    );
  if (safety.badge === "watch")
    return (
      <Badge variant="warning" className="gap-1">
        <ShieldAlert className="h-3 w-3" /> Watch
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <ShieldAlert className="h-3 w-3" /> Risky
    </Badge>
  );
}
