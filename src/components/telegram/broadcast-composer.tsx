"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  Wand2,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendBroadcast } from "@/server/actions/telegram";

const MAX = 4096;

export function BroadcastComposer({ chatLabel }: { chatLabel: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parseMode, setParseMode] = useState<"HTML" | "MarkdownV2" | "plain">("HTML");
  const [silent, setSilent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState<{
    url?: string;
    chatId: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 1) {
      toast.error("Write something first.");
      return;
    }
    startTransition(async () => {
      const r = await sendBroadcast({
        text,
        parseMode,
        silent,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setSent({ url: r.externalUrl, chatId: r.chatId });
      toast.success("Sent to the brotherhood.");
    });
  }

  async function inspire() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "telegram_post",
          topic:
            "A short reflective message for the Heaven's Leaf brotherhood — present moment, ritual, gathering. Keep it under 180 words.",
          emotionalTone: "contemplative",
          ctaIntensity: "none",
          tone: {
            reflection: 70,
            brotherhood: 80,
            cinematic: 70,
            spirituality: 40,
          },
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Generation failed");
      }
      // Stream into the textarea
      setText("");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setText((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>
          <CardTitle>Sent</CardTitle>
          <CardDescription>
            The message reached the brotherhood.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sent.url && (
            <Button variant="outline" asChild>
              <a href={sent.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Open in Telegram
              </a>
            </Button>
          )}
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSent(null);
                setText("");
                router.refresh();
              }}
            >
              Send another
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/telegram">Back to Telegram</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-ember-300" />
              Message
            </CardTitle>
            <CardDescription>
              Goes to{" "}
              <span className="text-ember-200 font-medium">{chatLabel}</span>.
              {" "}HTML formatting supported ({"<b>"}, {"<i>"}, {"<u>"}, {"<a href>"}).
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={inspire}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {aiLoading ? "Drawing the smoke…" : "Inspire with AI"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-3 w-3" /> Preview
              </TabsTrigger>
            </TabsList>
            <TabsContent value="write">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                rows={12}
                placeholder={
                  parseMode === "HTML"
                    ? "Brothers,\n\nThe porch is open this Saturday at sunset. Bring something to share — a story, a draw, a question worth pulling apart slowly.\n\n<i>The road is long. We keep it.</i>"
                    : "Write the message you want to send the brotherhood…"
                }
                className="font-mono text-xs"
              />
              <div className="text-[10px] text-muted-foreground mt-1">
                {text.length.toLocaleString()} / {MAX.toLocaleString()} chars ·{" "}
                {text.split(/\s+/).filter(Boolean).length.toLocaleString()}{" "}
                words
              </div>
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[280px] rounded-lg border border-white/[0.05] bg-ink-900/60 p-4">
                <PreviewBlock text={text} parseMode={parseMode} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-ember-300" /> Delivery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={parseMode}
                onValueChange={(v) => setParseMode(v as typeof parseMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="MarkdownV2">Markdown</SelectItem>
                  <SelectItem value="plain">Plain text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notification</Label>
              <div className="flex items-center justify-between rounded-md border border-white/10 bg-ink-900 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  {silent ? (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-ember-300" />
                  )}
                  <span>{silent ? "Silent" : "Notify members"}</span>
                </div>
                <Switch checked={!silent} onCheckedChange={(v) => setSilent(!v)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">
          {parseMode === "HTML"
            ? "HTML formatting"
            : parseMode === "MarkdownV2"
              ? "Markdown formatting"
              : "Plain text"}
        </Badge>
        <Button type="submit" variant="gold" disabled={pending || !text.trim()}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Send to brotherhood
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function PreviewBlock({
  text,
  parseMode,
}: {
  text: string;
  parseMode: "HTML" | "MarkdownV2" | "plain";
}) {
  if (!text.trim()) {
    return (
      <div className="text-muted-foreground italic font-display">
        Nothing to preview yet.
      </div>
    );
  }
  if (parseMode === "HTML") {
    // We trust the user's HTML here — they're the admin authoring the message.
    // Telegram has its own server-side whitelist that strips anything it
    // doesn't allow, so even malformed HTML can't actually do damage.
    return (
      <div
        className="text-sm text-ivory leading-relaxed whitespace-pre-wrap font-sans [&_b]:text-ember-200 [&_strong]:text-ember-200 [&_i]:italic [&_a]:text-ember-300 [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: sanitizeForPreview(text) }}
      />
    );
  }
  return (
    <pre className="whitespace-pre-wrap text-sm text-ivory leading-relaxed font-sans">
      {text}
    </pre>
  );
}

/**
 * Conservative HTML preview sanitizer. Telegram supports a narrow whitelist;
 * we strip everything outside of it so the preview matches what Telegram
 * will actually render.
 */
function sanitizeForPreview(html: string): string {
  // Allowed Telegram HTML tags
  const allowed = [
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "code",
    "pre",
    "a",
    "br",
  ];
  return html.replace(/<\/?([a-z]+)(?:\s[^>]*)?>/gi, (m, tag) => {
    return allowed.includes(tag.toLowerCase()) ? m : "";
  });
}
