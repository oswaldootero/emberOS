"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ImageGenerator,
  type GeneratedImagePayload,
} from "@/components/ai/image-generator";
import { publishToWordPress } from "@/server/actions/wordpress";
import { consumeWordPressHandoff } from "@/lib/handoff";

export function WPComposer() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [bodyFormat, setBodyFormat] = useState<"markdown" | "html">("markdown");
  const [status, setStatus] = useState<"draft" | "publish" | "future">("draft");
  const [scheduledFor, setScheduledFor] = useState("");
  const [yoastTitle, setYoastTitle] = useState("");
  const [yoastDescription, setYoastDescription] = useState("");
  const [yoastFocusKeyword, setYoastFocusKeyword] = useState("");
  const [featuredImage, setFeaturedImage] =
    useState<GeneratedImagePayload | null>(null);

  // Hydrate from Studio handoff on mount
  const [handoffNotice, setHandoffNotice] = useState(false);
  useEffect(() => {
    const handoff = consumeWordPressHandoff();
    if (handoff) {
      if (handoff.title) setTitle(handoff.title);
      setBody(handoff.body);
      if (handoff.bodyFormat) setBodyFormat(handoff.bodyFormat);
      if (handoff.excerpt) setExcerpt(handoff.excerpt);
      if (handoff.yoastFocusKeyword)
        setYoastFocusKeyword(handoff.yoastFocusKeyword);
      setHandoffNotice(true);
    }
  }, []);

  function autoSlug() {
    if (slug) return;
    setSlug(
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || body.trim().length < 20) {
      toast.error("Title and at least 20 characters of body are required.");
      return;
    }
    startTransition(async () => {
      const r = await publishToWordPress({
        title,
        body,
        bodyFormat,
        excerpt: excerpt || undefined,
        slug: slug || undefined,
        status,
        scheduledFor:
          status === "future" ? new Date(scheduledFor).toISOString() : undefined,
        yoastTitle: yoastTitle || undefined,
        yoastDescription: yoastDescription || undefined,
        yoastFocusKeyword: yoastFocusKeyword || undefined,
        featuredImageDataUrl: featuredImage?.dataUrl,
        featuredImageAlt: title,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setPublishedUrl(r.url);
      toast.success(
        status === "publish"
          ? "Published to WordPress."
          : status === "future"
            ? "Scheduled."
            : "Draft saved to WordPress.",
      );
    });
  }

  if (publishedUrl) {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
          </div>
          <CardTitle>
            {status === "publish"
              ? "Published"
              : status === "future"
                ? "Scheduled"
                : "Saved as draft"}
          </CardTitle>
          <CardDescription>
            {status === "publish"
              ? "It's live on WordPress."
              : status === "future"
                ? "It'll go live at the scheduled time."
                : "Stored as a draft you can refine later."}
            {featuredImage && " Featured image attached."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" asChild>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {status === "publish" ? "View on site" : "Open in WordPress"}
            </a>
          </Button>
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPublishedUrl(null);
                setTitle("");
                setSlug("");
                setExcerpt("");
                setBody("");
                setYoastTitle("");
                setYoastDescription("");
                setYoastFocusKeyword("");
                setFeaturedImage(null);
                router.refresh();
              }}
            >
              Draft another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const imagePromptDefault = title || excerpt || "";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {handoffNotice && (
        <div className="flex items-start gap-3 rounded-lg border border-ember-500/30 bg-ember-500/5 p-3 text-xs">
          <Sparkles className="h-4 w-4 text-ember-300 shrink-0 mt-0.5" />
          <div className="flex-1 text-ivory">
            Content imported from the AI Studio. Review the title, slug, and
            body before publishing.
          </div>
          <button
            type="button"
            onClick={() => setHandoffNotice(false)}
            className="text-muted-foreground hover:text-ivory"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <Card className="lg:order-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-ember-300" /> Article
            </CardTitle>
            <CardDescription>
              Write in Markdown — converted to HTML on publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={autoSlug}
                placeholder="The Slow Burn of Faith"
                required
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="the-slow-burn-of-faith"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="One or two sentences that capture the article…"
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Body</Label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setBodyFormat("markdown")}
                    className={`rounded px-2 py-0.5 ${bodyFormat === "markdown" ? "bg-ember-500/15 text-ember-200" : "text-muted-foreground"}`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyFormat("html")}
                    className={`rounded px-2 py-0.5 ${bodyFormat === "html" ? "bg-ember-500/15 text-ember-200" : "text-muted-foreground"}`}
                  >
                    HTML
                  </button>
                </div>
              </div>
              <Tabs defaultValue="write">
                <TabsList>
                  <TabsTrigger value="write">Write</TabsTrigger>
                  <TabsTrigger value="preview">
                    <Eye className="h-3 w-3" /> Preview
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={20}
                    className="font-mono text-xs"
                    placeholder={
                      bodyFormat === "markdown"
                        ? "## Open with an image\n\nNot with a thesis. Lead with the porch, the long road, the draw before it caught.\n\n## Then move inward\n\n…"
                        : "<h2>Open with an image</h2>\n<p>…</p>"
                    }
                  />
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {body.length.toLocaleString()} chars ·{" "}
                    {body.split(/\s+/).filter(Boolean).length.toLocaleString()}{" "}
                    words
                  </div>
                </TabsContent>
                <TabsContent value="preview">
                  <div className="min-h-[420px] rounded-lg border border-white/[0.05] bg-ink-900/60 p-4">
                    {body ? (
                      <pre className="whitespace-pre-wrap text-sm text-ivory leading-relaxed font-sans">
                        {body}
                      </pre>
                    ) : (
                      <div className="text-muted-foreground italic font-display">
                        Nothing to preview yet.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-4 w-4 text-ember-300" /> Publish Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as typeof status)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Save as draft</SelectItem>
                    <SelectItem value="publish">Publish now</SelectItem>
                    <SelectItem value="future">Schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {status === "future" && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled">
                    <CalendarClock className="h-3 w-3 inline mr-1" />
                    Scheduled for
                  </Label>
                  <Input
                    id="scheduled"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    required={status === "future"}
                  />
                </div>
              )}
              {featuredImage && (
                <div className="flex items-center gap-2 rounded-md border border-ember-500/20 bg-ember-500/5 p-2 text-[10px]">
                  <Sparkles className="h-3 w-3 text-ember-300" />
                  Featured image attached
                  <button
                    type="button"
                    onClick={() => setFeaturedImage(null)}
                    className="ml-auto text-muted-foreground hover:text-ivory"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <Button
                type="submit"
                variant="gold"
                className="w-full"
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {pending
                  ? "Sending to WordPress…"
                  : status === "publish"
                    ? "Publish now"
                    : status === "future"
                      ? "Schedule"
                      : "Save draft"}
              </Button>
            </CardContent>
          </Card>

          <ImageGenerator
            defaultPrompt={imagePromptDefault}
            onImage={(img) => setFeaturedImage(img)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ember-300" /> Yoast SEO
              </CardTitle>
              <CardDescription>
                Optional. Helps with Google preview + on-page SEO score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yoast-title">SEO title</Label>
                <Input
                  id="yoast-title"
                  value={yoastTitle}
                  onChange={(e) => setYoastTitle(e.target.value)}
                  placeholder="Defaults to article title"
                  maxLength={80}
                />
                <div className="text-[10px] text-muted-foreground">
                  {yoastTitle.length}/80
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yoast-desc">Meta description</Label>
                <Textarea
                  id="yoast-desc"
                  value={yoastDescription}
                  onChange={(e) => setYoastDescription(e.target.value)}
                  placeholder="Under 160 characters."
                  maxLength={160}
                  rows={3}
                />
                <div className="text-[10px] text-muted-foreground">
                  {yoastDescription.length}/160
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yoast-keyword">Focus keyword</Label>
                <Input
                  id="yoast-keyword"
                  value={yoastFocusKeyword}
                  onChange={(e) => setYoastFocusKeyword(e.target.value)}
                  placeholder="cigar lounge rituals"
                />
              </div>
            </CardContent>
          </Card>

          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              REST API
            </Badge>
            Published via /wp-json/wp/v2/posts as the authenticated WP user.
          </div>
        </div>
      </div>
    </form>
  );
}
