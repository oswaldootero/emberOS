"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, Loader2, MapPin, Megaphone, Search, Store, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fmtFollowers } from "@/components/influencers/stage-badge";
import { addScoutedAccount, findInstagramAccounts } from "@/server/actions/scout";
import type { ScoutResult } from "@/server/social/scout";

const EXAMPLES = [
  "cigar lounges in Tampa",
  "whiskey and cigar reviewers with 10K–100K followers",
  "golf lifestyle creators who post cigars",
  "tobacconists in Charlotte NC",
  "faith-based men's brotherhood accounts",
];

export function FindAccountsClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScoutResult[] | null>(null);
  const [searching, startSearch] = useTransition();

  function search(q = query) {
    const trimmed = q.trim();
    if (trimmed.length < 3) return;
    setQuery(trimmed);
    startSearch(async () => {
      const r = await findInstagramAccounts(trimmed);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setResults(r.results);
      if (r.results.length === 0) toast.message("Nothing solid found — try different words or a wider area.");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-ember-300" /> Who are you looking for?
          </CardTitle>
          <CardDescription>
            Plain English works. Results come from web search, so they favor established accounts and
            follower counts are approximate — open the profile before you reach out.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
            className="flex gap-2"
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. cigar lounges in Miami that host events"
              className="flex-1"
            />
            <Button type="submit" variant="gold" disabled={searching || query.trim().length < 3}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find
            </Button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={searching}
                onClick={() => search(ex)}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-ivory hover:border-ember-500/40"
              >
                {ex}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {searching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching the web for Instagram accounts… this takes 10–30 seconds.
        </div>
      )}

      {results && !searching && (
        <Card>
          <CardHeader>
            <CardTitle>
              {results.length} account{results.length === 1 ? "" : "s"} found
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nothing solid. Try broader terms, a bigger city, or a different angle.</p>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {results.map((r) => (
                  <ResultRow key={r.handle ?? r.name} r={r} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultRow({ r }: { r: ScoutResult }) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState<{ kind: "influencer" | "prospect"; id: string } | null>(
    r.tracked.influencerId
      ? { kind: "influencer", id: r.tracked.influencerId }
      : r.tracked.prospectId
        ? { kind: "prospect", id: r.tracked.prospectId }
        : null,
  );

  function add(kind: "influencer" | "prospect") {
    start(async () => {
      const res = await addScoutedAccount(
        {
          handle: r.handle,
          name: r.name,
          url: r.url,
          kind: r.kind,
          summary: r.summary,
          followersApprox: r.followersApprox,
          location: r.location,
          website: r.website,
          sourceUrl: r.sourceUrl,
        },
        kind,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAdded({ kind, id: res.id });
      toast.success(res.created ? `Added as ${kind}.` : `Already tracked as ${kind} — opened the existing record.`);
    });
  }

  return (
    <li className="py-3 flex gap-3">
      <div className="h-9 w-9 shrink-0 rounded-full border border-ember-500/30 bg-ember-500/10 flex items-center justify-center text-ember-200 text-sm font-semibold uppercase">
        {(r.handle ?? r.name)[0]}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="text-ivory font-medium hover:text-ember-200 truncate">
              {r.name}
            </a>
          ) : (
            <span className="text-ivory font-medium truncate">{r.name}</span>
          )}
          {r.handle ? (
            <span className="text-muted-foreground text-xs">@{r.handle}</span>
          ) : (
            <Badge variant="outline" className="text-[9px] opacity-70">No Instagram found</Badge>
          )}
          <Badge variant={r.kind === "BUSINESS" ? "secondary" : r.kind === "INFLUENCER" ? "gold" : "outline"} className="text-[9px]">
            {r.kind === "BUSINESS" ? "Business" : r.kind === "INFLUENCER" ? "Creator" : "Unknown"}
          </Badge>
          {r.followersApprox != null && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
              <Users className="h-3 w-3" /> ~{fmtFollowers(r.followersApprox)}
            </span>
          )}
          {r.location && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" /> {r.location}
            </span>
          )}
        </div>
        {r.summary && <p className="text-xs text-ivory/80">{r.summary}</p>}
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          {r.handle && r.url && (
            <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ember-200 hover:underline">
              <ExternalLink className="h-3 w-3" /> Open profile
            </a>
          )}
          {r.website && (
            <a href={r.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ember-200 hover:underline">
              <ExternalLink className="h-3 w-3" /> Website
            </a>
          )}
          {r.sourceUrl && (
            <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:underline truncate max-w-[16rem]">
              source
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {added ? (
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link href={added.kind === "influencer" ? `/influencers/${added.id}` : `/prospects/${added.id}`}>
                {added.kind === "influencer" ? <Megaphone className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                Tracked — open {added.kind}
              </Link>
            </Button>
          ) : (
            <>
              {r.handle && (
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={pending} onClick={() => add("influencer")}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />} Add influencer
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={pending} onClick={() => add("prospect")}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />} Add prospect
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
