"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Check, Loader2, ScanSearch, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtFollowers } from "./stage-badge";
import { compressImage } from "@/lib/compress-image";
import {
  createInfluencer,
  extractInfluencerFromScreenshots,
  type ExtractedInfluencer,
} from "@/server/actions/influencers";

export function InfluencerScanClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{
    fields: ExtractedInfluencer;
    existing: { id: string; name: string } | null;
  } | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    setResult(null);
    setPreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    });
    e.target.value = "";
  }

  async function extract() {
    if (previews.length === 0) return;
    setExtracting(true);
    setResult(null);
    try {
      const fd = new FormData();
      for (const p of previews) fd.append("images", await compressImage(p.file));
      const r = await extractInfluencerFromScreenshots(fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setResult({ fields: r.fields, existing: r.existing });
    } finally {
      setExtracting(false);
    }
  }

  async function create() {
    if (!result) return;
    setCreating(true);
    try {
      const f = result.fields;
      const r = await createInfluencer({
        name: f.name,
        handle: f.handle,
        platform: f.platform ?? "Instagram",
        followerCount: f.followerCount,
        followingCount: f.followingCount,
        postCount: f.postCount,
        niche: f.niche,
        bio: f.bio,
        location: f.location,
        email: f.email,
        otherSocials: f.otherSocials,
        notes: f.notes ? `From screenshot: ${f.notes}` : null,
        tags: ["screenshot"],
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Influencer added — log shipments and posts from their profile.");
      router.push(`/influencers/${r.id}`);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  const rows: { label: string; value: string | null }[] = result
    ? [
        { label: "Name", value: result.fields.name },
        { label: "Handle", value: result.fields.handle ? `@${result.fields.handle}` : null },
        { label: "Platform", value: result.fields.platform },
        {
          label: "Followers",
          value:
            result.fields.followerCount != null
              ? `${fmtFollowers(result.fields.followerCount)} (${result.fields.followerCount.toLocaleString()})`
              : null,
        },
        {
          label: "Following",
          value: result.fields.followingCount?.toLocaleString() ?? null,
        },
        { label: "Posts", value: result.fields.postCount?.toLocaleString() ?? null },
        { label: "Niche", value: result.fields.niche },
        { label: "Location", value: result.fields.location },
        { label: "Email", value: result.fields.email },
        { label: "Other socials", value: result.fields.otherSocials },
        { label: "Bio", value: result.fields.bio },
        { label: "Notes", value: result.fields.notes },
      ]
    : [];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-ember-300" />
            Screenshots
          </CardTitle>
          <CardDescription>
            Up to 3 images — their Instagram profile, bio, or grid. Follower
            counts and niche get pulled automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={pick}
            className="hidden"
          />
          {previews.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-white/[0.15] py-12 text-center hover:border-ember-500/40 transition"
            >
              <Camera className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
              <div className="text-sm text-ivory">Choose screenshots</div>
              <div className="text-[11px] text-muted-foreground">
                from your photo library
              </div>
            </button>
          ) : (
            <div className="flex gap-3 flex-wrap">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`Screenshot ${i + 1}`}
                    className="h-40 rounded-lg border border-white/10 object-contain bg-ink-900"
                  />
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

          {previews.length > 0 && !result && (
            <Button variant="gold" onClick={extract} disabled={extracting} className="w-full">
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Reading the screenshot…
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" /> Extract influencer info
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-ember-500/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ember-300" />
              {result.fields.name}
            </CardTitle>
            <CardDescription>
              Review what was found — everything stays editable on their
              profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.existing && (
              <div className="rounded-md border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs text-ivory">
                Heads up —{" "}
                <Link
                  href={`/influencers/${result.existing.id}`}
                  className="text-ember-200 underline underline-offset-2"
                >
                  {result.existing.name}
                </Link>{" "}
                is already on the roster. Creating again will make a duplicate.
              </div>
            )}
            <div className="space-y-1.5">
              {rows
                .filter((r) => r.value)
                .map((r) => (
                  <div key={r.label} className="flex gap-3 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">
                      {r.label}
                    </span>
                    <span className="text-ivory/90 min-w-0 break-words text-xs">{r.value}</span>
                  </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="gold" onClick={create} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Add influencer
              </Button>
              <Button
                variant="ghost"
                onClick={() => setResult(null)}
                disabled={creating}
                className="text-muted-foreground"
              >
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
