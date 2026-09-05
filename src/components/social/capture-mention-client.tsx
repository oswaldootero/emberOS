"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Link2, Loader2, Megaphone, Store, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/compress-image";
import { cleanInstagramHandle, parseInstagramUrl } from "@/server/social/instagram";
import { captureMention, type CaptureResult } from "@/server/actions/social";

type Done = Extract<CaptureResult, { ok: true }>;

export function CaptureMentionClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [handle, setHandle] = useState("");
  const [note, setNote] = useState("");
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<Done | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    });
    e.target.value = "";
  }

  // A profile link carries the handle; a post link does not (instagram.com/p/CODE).
  const linkInfo = link.trim() ? parseInstagramUrl(link) : null;
  const linkHasHandle = Boolean(linkInfo && "handle" in linkInfo && linkInfo.handle);
  const linkIsBad = Boolean(link.trim() && !linkInfo);
  const canSubmit = Boolean(cleanInstagramHandle(handle) || linkHasHandle || previews.length) && !linkIsBad;

  function onLinkChange(v: string) {
    setLink(v);
    const info = v.trim() ? parseInstagramUrl(v) : null;
    if (info && "handle" in info && info.handle && !handle.trim()) setHandle(info.handle);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    start(async () => {
      const fd = new FormData();
      fd.set("link", link);
      fd.set("handle", handle);
      fd.set("note", note);
      for (const p of previews) fd.append("images", await compressImage(p.file));
      const r = await captureMention(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDone(r);
      toast.success(r.duplicate ? "Already captured — refreshed it." : `Captured @${r.username}.`);
      router.refresh();
    });
  }

  function reset() {
    setDone(null);
    setLink("");
    setHandle("");
    setNote("");
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  }

  if (done) {
    return (
      <Card className="border-ember-500/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-300" /> @{done.username} is in the inbox
          </CardTitle>
          <CardDescription>
            {done.influencer
              ? <>Linked to influencer <Link href={`/influencers/${done.influencer.id}`} className="text-ember-200 hover:underline">{done.influencer.name}</Link>.</>
              : done.prospect
                ? <>Linked to prospect <Link href={`/prospects/${done.prospect.id}`} className="text-ember-200 hover:underline">{done.prospect.name}</Link>.</>
                : "Not linked to anyone yet — add them as an influencer or prospect from the inbox."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="gold" asChild>
            <Link href="/social/mentions">Open inbox</Link>
          </Button>
          {!done.influencer && (
            <Button variant="outline" asChild>
              <Link href={`/social/mentions`}><Megaphone className="h-4 w-4" /> Add as influencer there</Link>
            </Button>
          )}
          <Button variant="ghost" className="text-muted-foreground" onClick={reset}>
            Capture another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-lg border border-white/[0.06] bg-ink-900/40 p-4 text-xs text-muted-foreground space-y-1.5">
        <div className="text-sm text-ivory font-medium">How this works</div>
        <p>
          Someone posts a photo, story, or comment that tags Heaven&apos;s Leaf. You save who it was
          here — <strong className="text-ivory">the @handle is all that&apos;s required</strong>. The link and a
          screenshot are optional extras that keep the post and its like count on file.
        </p>
        <p>
          Every capture lands in the <Link href="/social/mentions" className="text-ember-200 hover:underline">Mentions inbox</Link>,
          where one tap turns that account into an influencer to seed, or a lounge/shop prospect.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-ember-300" /> Who tagged you
          </CardTitle>
          <CardDescription>
            Their @handle is shown at the top of the post. If you paste a <em>profile</em> link, the handle
            fills in by itself. A <em>post</em> link (instagram.com/p/…) doesn&apos;t include who posted it, so
            type the handle or add a screenshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">@handle · required unless you add a screenshot</label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@cigarloungetampa"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Link to the post or profile · optional</label>
            <Input
              value={link}
              onChange={(e) => onLinkChange(e.target.value)}
              placeholder="In Instagram: ⋯ on the post → Copy link → paste here"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1"
            />
            {linkIsBad && (
              <p className="mt-1 text-[11px] text-amber-300">That doesn&apos;t look like an Instagram link.</p>
            )}
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Note · optional</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="“lounge in Tampa”, “asked about wholesale”"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-ember-300" /> Screenshots
            <span className="text-xs font-normal text-muted-foreground">optional</span>
          </CardTitle>
          <CardDescription>
            Up to 3 — the post, the story, or the notification. AI reads the @handle, caption, and
            like count, so with a screenshot you can leave the fields above empty.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={pick} className="hidden" />
          {previews.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-white/[0.15] py-10 text-center hover:border-ember-500/40 transition"
            >
              <Camera className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm text-ivory">Choose screenshots</div>
              <div className="text-[11px] text-muted-foreground">from your photo library</div>
            </button>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Screenshot ${i + 1}`} className="h-40 rounded-lg border border-white/10 object-contain bg-ink-900" />
                  <button
                    type="button"
                    aria-label="Remove screenshot"
                    onClick={() =>
                      setPreviews((prev) => {
                        URL.revokeObjectURL(prev[i]!.url);
                        return prev.filter((_, x) => x !== i);
                      })
                    }
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-ink-850 border border-white/20 flex items-center justify-center text-muted-foreground hover:text-red-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {previews.length < 3 && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="h-40 w-24 rounded-lg border border-dashed border-white/[0.15] flex items-center justify-center text-muted-foreground hover:border-ember-500/40"
                  aria-label="Add another screenshot"
                >
                  <Camera className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!canSubmit && !pending && (
        <p className="text-[11px] text-muted-foreground text-center">
          Enter the @handle, paste a profile link, or add a screenshot to continue.
        </p>
      )}
      <Button type="submit" variant="gold" className="w-full" disabled={!canSubmit || pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {previews.length ? "Reading the screenshot…" : "Saving…"}
          </>
        ) : (
          <>
            <Store className="h-4 w-4" /> Save to inbox
          </>
        )}
      </Button>
    </form>
  );
}
