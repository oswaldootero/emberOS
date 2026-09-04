"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Heart, Loader2, MessageCircle, RefreshCw, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtFollowers } from "@/components/influencers/stage-badge";
import {
  createInfluencerFromInstagram,
  lookupInstagramHandle,
  refreshInfluencerFromInstagram,
} from "@/server/actions/social";
import type { IgProfileSummary } from "@/server/social/instagram";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

export function HandleLookupClient({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [looking, startLookup] = useTransition();
  const [saving, startSave] = useTransition();
  const [result, setResult] = useState<{
    profile: IgProfileSummary;
    existing: { id: string; name: string } | null;
  } | null>(null);

  function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!handle.trim()) return;
    startLookup(async () => {
      const r = await lookupInstagramHandle(handle);
      if (!r.ok) {
        setResult(null);
        { toast.error(r.error); return; }
      }
      setResult({ profile: r.profile, existing: r.existing });
    });
  }

  function add() {
    if (!result) return;
    startSave(async () => {
      const r = await createInfluencerFromInstagram(result.profile.handle);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Influencer added — log shipments and posts from their profile.");
      router.push(`/influencers/${r.id}`);
      router.refresh();
    });
  }

  function refresh() {
    if (!result?.existing) return;
    const id = result.existing.id;
    startSave(async () => {
      const r = await refreshInfluencerFromInstagram(id);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success(`Stats refreshed — ${fmtFollowers(r.followerCount)} followers.`);
      router.push(`/influencers/${id}`);
      router.refresh();
    });
  }

  const p = result?.profile;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-ember-300" /> Instagram username
          </CardTitle>
          <CardDescription>
            Works for Business and Creator accounts, which covers most real influencers and
            nearly every lounge or shop. Personal accounts can&apos;t be looked up — use the screenshot flow for those.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={lookup} className="flex gap-2">
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle or instagram.com/handle"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="flex-1"
            />
            <Button type="submit" variant="gold" disabled={!configured || looking || !handle.trim()}>
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              Look up
            </Button>
          </form>
          {!configured && (
            <p className="mt-3 text-xs text-amber-300">
              Instagram isn&apos;t connected yet. Follow docs/SOCIAL-SCOUTING.md, then this page lights up.
            </p>
          )}
        </CardContent>
      </Card>

      {p && (
        <Card className="border-ember-500/25">
          <CardHeader>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <CardTitle className="truncate">{p.name}</CardTitle>
                <CardDescription>
                  <a href={p.profileUrl} target="_blank" rel="noreferrer" className="text-ember-200 hover:underline">
                    @{p.handle}
                  </a>
                  {p.website && (
                    <>
                      {" · "}
                      <a href={p.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {p.website.replace(/^https?:\/\//, "")}
                      </a>
                    </>
                  )}
                </CardDescription>
              </div>
              <span className="inline-flex items-center justify-center h-10 min-w-[3.25rem] px-2 rounded-md text-sm font-semibold tabular-nums border border-ember-500/40 bg-ember-500/10 text-ember-200">
                {fmtFollowers(p.followerCount)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Followers" value={p.followerCount?.toLocaleString() ?? "—"} />
              <Stat label="Following" value={p.followingCount?.toLocaleString() ?? "—"} />
              <Stat label="Posts" value={p.postCount?.toLocaleString() ?? "—"} />
              <Stat
                label="Engagement"
                value={p.engagementRate != null ? `${p.engagementRate}%` : "—"}
                hint={
                  p.avgLikes != null
                    ? `~${p.avgLikes.toLocaleString()} likes · ${p.avgComments?.toLocaleString() ?? 0} comments per post`
                    : undefined
                }
                accent={
                  p.engagementRate == null
                    ? undefined
                    : p.engagementRate >= 3
                      ? "text-emerald-300"
                      : p.engagementRate < 1
                        ? "text-amber-300"
                        : undefined
                }
              />
            </div>
            {p.bio && <p className="text-xs text-ivory/80 whitespace-pre-line">{p.bio}</p>}

            {result?.existing && (
              <div className="rounded-md border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs text-ivory">
                <Link href={`/influencers/${result.existing.id}`} className="text-ember-200 underline underline-offset-2">
                  {result.existing.name}
                </Link>{" "}
                is already on the roster — refresh their numbers instead of adding a duplicate.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {result?.existing ? (
                <Button variant="gold" onClick={refresh} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh {result.existing.name}
                </Button>
              ) : (
                <Button variant="gold" onClick={add} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Add influencer
                </Button>
              )}
              <Button variant="ghost" className="text-muted-foreground" onClick={() => setResult(null)} disabled={saving}>
                Clear
              </Button>
            </div>

            {p.recentPosts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recent posts</div>
                <ul className="divide-y divide-white/[0.04]">
                  {p.recentPosts.map((post) => (
                    <li key={post.id} className="py-2 flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground w-14 shrink-0 tabular-nums">{fmtDate(post.postedAt)}</span>
                      <span className="flex-1 min-w-0 truncate text-ivory/80">
                        {post.caption?.split("\n")[0] || <span className="text-muted-foreground italic">no caption</span>}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground shrink-0">
                        <Heart className="h-3 w-3" /> {post.likes?.toLocaleString() ?? "—"}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground shrink-0 hidden sm:inline-flex">
                        <MessageCircle className="h-3 w-3" /> {post.comments?.toLocaleString() ?? "—"}
                      </span>
                      {post.permalink && (
                        <a href={post.permalink} target="_blank" rel="noreferrer" aria-label="Open post" className="text-ember-200 p-1.5 -m-1">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-xl tabular-nums ${accent ?? "text-ivory"}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
