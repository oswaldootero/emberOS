"use client";

import { useState } from "react";
import { Loader2, Recycle, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { RepurposeOutput } from "@/server/ai/repurpose";

const SOURCE_TYPES = [
  { value: "blog", label: "Blog post" },
  { value: "transcript", label: "Video / podcast transcript" },
  { value: "voice_note", label: "Voice note (text)" },
  { value: "caption", label: "Existing caption" },
  { value: "freeform", label: "Freeform notes" },
] as const;

export function RepurposeClient() {
  const [source, setSource] = useState("");
  const [sourceType, setSourceType] =
    useState<(typeof SOURCE_TYPES)[number]["value"]>("freeform");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<RepurposeOutput | null>(null);
  const [meta, setMeta] = useState<{
    model?: string;
    totalTokens?: number;
    costUsd?: number;
  } | null>(null);

  async function run() {
    if (source.trim().length < 20) {
      toast.error("Source needs to be at least 20 characters.");
      return;
    }
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, sourceType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Repurpose failed");
      setOutput(json.output);
      setMeta(json.meta);
      toast.success("Repurposed across 8 surfaces.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Recycle className="h-4 w-4 text-ember-300" /> Source Material
          </CardTitle>
          <CardDescription>
            Drop a blog, transcript, voice note, or rough thought. We'll shape it
            for every channel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-[200px_1fr] gap-3">
            <div className="space-y-2">
              <Label>Source type</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => setSourceType(v as typeof sourceType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source content</Label>
              <Textarea
                rows={10}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Paste the full source here…"
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {source.length.toLocaleString()} characters
            </div>
            <Button variant="gold" onClick={run} disabled={running}>
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Repurposing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Repurpose Everywhere
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {output && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Outputs</CardTitle>
              <CardDescription>{output.summary}</CardDescription>
            </div>
            {meta && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline">{meta.model}</Badge>
                <span>{meta.totalTokens?.toLocaleString()} tok</span>
                <span>·</span>
                <span>${meta.costUsd?.toFixed(4)}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="instagram">
              <TabsList className="flex-wrap">
                <TabsTrigger value="instagram">Instagram</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
                <TabsTrigger value="telegram">Telegram</TabsTrigger>
                <TabsTrigger value="x">X / Twitter</TabsTrigger>
                <TabsTrigger value="youtube">YouTube</TabsTrigger>
                <TabsTrigger value="seo">SEO Article</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="extras">Quotes / Reels</TabsTrigger>
              </TabsList>

              <TabsContent value="instagram">
                <OutputBlock text={output.instagram_caption}>
                  <HashtagRow tags={output.hashtags} />
                </OutputBlock>
              </TabsContent>
              <TabsContent value="facebook">
                <OutputBlock text={output.facebook_post} />
              </TabsContent>
              <TabsContent value="telegram">
                <OutputBlock text={output.telegram_post} />
              </TabsContent>
              <TabsContent value="x">
                <OutputBlock text={output.x_twitter}>
                  <div className="text-[10px] text-muted-foreground mt-2">
                    {output.x_twitter.length} / 280
                  </div>
                </OutputBlock>
              </TabsContent>
              <TabsContent value="youtube">
                <OutputBlock text={output.youtube_description} />
              </TabsContent>
              <TabsContent value="seo">
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4 space-y-2">
                    <div className="font-display text-xl text-ivory">
                      {output.seo_article_outline.title}
                    </div>
                    <div className="text-xs text-muted-foreground italic">
                      Meta: {output.seo_article_outline.metaDescription}
                    </div>
                  </div>
                  {output.seo_article_outline.sections.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4"
                    >
                      <div className="font-medium text-ember-200 mb-2">
                        {s.heading}
                      </div>
                      <ul className="space-y-1 text-sm text-ivory/90 list-disc list-inside">
                        {s.bullets.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="email">
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4 space-y-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Subject
                    </div>
                    <div className="text-ivory">{output.email_copy.subject}</div>
                    <div className="text-xs text-muted-foreground mt-2 italic">
                      Preheader: {output.email_copy.preheader}
                    </div>
                  </div>
                  <OutputBlock text={output.email_copy.body} />
                </div>
              </TabsContent>
              <TabsContent value="extras">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Pull quotes
                    </div>
                    <ul className="space-y-2">
                      {output.pull_quotes.map((q, i) => (
                        <li
                          key={i}
                          className="font-display italic text-ivory border-l-2 border-ember-500/40 pl-3"
                        >
                          "{q}"
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                      Reel hooks
                    </div>
                    <ul className="space-y-2">
                      {output.reel_hooks.map((h, i) => (
                        <li key={i} className="text-sm text-ivory">
                          {i + 1}. {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OutputBlock({
  text,
  children,
}: {
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/[0.05] bg-ink-900/60 p-4 whitespace-pre-wrap text-sm text-ivory leading-relaxed font-mono">
        {text}
      </div>
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(text);
            toast.success("Copied.");
          }}
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </div>
      {children}
    </div>
  );
}

function HashtagRow({ tags }: { tags: string[] }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Hashtags ({tags.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Badge key={t} variant="outline" className="text-[10px]">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}
