"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckSquare, Hash, Loader2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { newTaskHref } from "@/components/tasks/new-task-button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { refreshHashtagBrief } from "@/server/actions/scout";
import type { StoredBrief } from "@/server/social/scout";

const USE_LABEL = { post: "Post with", monitor: "Monitor", both: "Post + monitor" } as const;

export function HashtagBriefCard({ initial }: { initial: StoredBrief | null }) {
  const [brief, setBrief] = useState<StoredBrief | null>(initial);
  const [pending, start] = useTransition();
  const [autoTried, setAutoTried] = useState(false);

  function generate(force: boolean) {
    start(async () => {
      const r = await refreshHashtagBrief(force);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setBrief(r.brief);
    });
  }

  // First visit of the day: build today's brief automatically.
  useEffect(() => {
    if (!brief && !autoTried) {
      setAutoTried(true);
      generate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = brief
    ? new Date(brief.forDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    : null;

  return (
    <Card className="border-ember-500/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-ember-300" /> Hashtags to watch today
            </CardTitle>
            <CardDescription>
              {date ? `${date} · refreshed daily by AI web research` : "A fresh set every morning: what to post with, what to monitor for finding accounts."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {brief && (
              <Button variant="outline" size="sm" asChild>
                <Link href={newTaskHref({ title: "Post with today's hashtags and reach out to accounts using them", tag: "hashtag", due: new Date().toLocaleDateString("en-CA") })}>
                  <CheckSquare className="h-4 w-4" /> Make it a task
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={pending} onClick={() => generate(true)}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Regenerate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!brief && pending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Researching what&apos;s moving in the cigar corner of Instagram…
          </div>
        )}
        {!brief && !pending && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No brief yet for today. Hit Regenerate to build one.
          </p>
        )}
        {brief && (
          <>
            {brief.summary && <p className="text-sm text-ivory/90">{brief.summary}</p>}
            <div className="grid md:grid-cols-2 gap-2">
              {brief.hashtags.map((h) => (
                <div key={h.tag} className="rounded-lg border border-white/[0.05] bg-ink-900/40 p-3 flex gap-3">
                  <a
                    href={`https://www.instagram.com/explore/tags/${h.tag}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ember-200 font-medium hover:underline shrink-0 text-sm"
                  >
                    #{h.tag}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <Badge variant={h.use === "post" ? "gold" : h.use === "monitor" ? "outline" : "secondary"} className="text-[9px]">
                        {USE_LABEL[h.use]}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] opacity-70">{h.volume}</Badge>
                    </div>
                    {h.why && <p className="text-xs text-muted-foreground">{h.why}</p>}
                  </div>
                </div>
              ))}
            </div>
            {brief.accountsToWatch.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Accounts to watch
                </div>
                <ul className="divide-y divide-white/[0.04]">
                  {brief.accountsToWatch.map((a) => (
                    <li key={a.handle} className="py-1.5 flex items-center gap-3 text-xs">
                      <a href={`https://instagram.com/${a.handle}`} target="_blank" rel="noreferrer" className="text-ivory hover:text-ember-200 shrink-0">
                        @{a.handle}
                      </a>
                      <span className="text-muted-foreground truncate">{a.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
