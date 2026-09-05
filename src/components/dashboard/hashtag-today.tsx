"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight, CheckSquare, Hash, Loader2 } from "lucide-react";
import { newTaskHref } from "@/components/tasks/new-task-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { refreshHashtagBrief } from "@/server/actions/scout";
import { pickFeaturedHashtag } from "@/server/dashboard/today-logic";
import type { StoredBrief } from "@/server/social/scout";

/** Compact daily hashtag card for the Today board. Builds the brief on first view of the day. */
export function HashtagToday({ initial }: { initial: StoredBrief | null }) {
  const [brief, setBrief] = useState<StoredBrief | null>(initial);
  const [pending, start] = useTransition();
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!brief && !tried) {
      setTried(true);
      start(async () => {
        const r = await refreshHashtagBrief(false);
        if (r.ok) setBrief(r.brief);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featured = brief ? pickFeaturedHashtag(brief.hashtags) : null;
  const rest = brief ? brief.hashtags.filter((h) => h.tag !== featured?.tag).slice(0, 8) : [];

  return (
    <Card className="border-ember-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4 text-ember-300" /> Hashtag to follow today
        </CardTitle>
        <CardDescription>Picked daily by AI research. Search it on Instagram and see who&apos;s posting.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!brief && pending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Researching today&apos;s brief…
          </div>
        )}
        {!brief && !pending && (
          <p className="text-xs text-muted-foreground py-2">No brief yet today. Open Find accounts to build one.</p>
        )}
        {featured && (
          <a
            href={`https://www.instagram.com/explore/tags/${featured.tag}/`}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg border border-ember-500/30 bg-ember-500/[0.08] p-3 hover:bg-ember-500/[0.14] transition-colors"
          >
            <div className="font-display text-2xl text-ember-200 tracking-tight">#{featured.tag}</div>
            {featured.why && <p className="text-xs text-ivory/80 mt-1">{featured.why}</p>}
          </a>
        )}
        {rest.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {rest.map((h) => (
              <Badge key={h.tag} variant={h.use === "post" ? "gold" : "outline"} className="text-[10px]">
                #{h.tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/social/find" className="inline-flex items-center gap-1 text-xs text-ember-200 hover:underline">
            Full brief and account finder <ArrowRight className="h-3 w-3" />
          </Link>
          {featured && (
            <Link
              href={newTaskHref({ title: `Work #${featured.tag} today — post and reach out to who's using it`, tag: "hashtag", due: new Date().toLocaleDateString("en-CA") })}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-ivory"
            >
              <CheckSquare className="h-3 w-3" /> Make it a task
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
