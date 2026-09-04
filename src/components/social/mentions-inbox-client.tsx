"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ExternalLink,
  EyeOff,
  Heart,
  Loader2,
  Megaphone,
  MessageCircle,
  RefreshCw,
  RotateCcw,
  Store,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addInfluencerFromMention,
  addProspectFromMention,
  logMentionAsPost,
  setMentionStatus,
  syncMentionsNow,
} from "@/server/actions/social";

export type MentionRow = {
  id: string;
  source: "TAG" | "CAPTION_MENTION" | "COMMENT_MENTION";
  username: string;
  caption: string | null;
  permalink: string | null;
  mediaType: string | null;
  likeCount: number | null;
  commentCount: number | null;
  postedAt: string;
  status: "NEW" | "REVIEWED" | "DISMISSED";
  influencer: { id: string; name: string } | null;
  prospect: { id: string; name: string } | null;
  loggedPostId: string | null;
};

const SOURCE_LABEL: Record<MentionRow["source"], string> = {
  TAG: "Tagged",
  CAPTION_MENTION: "Caption",
  COMMENT_MENTION: "Comment",
};

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function SyncMentionsButton({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="gold"
      size="sm"
      disabled={!configured || pending}
      title={configured ? "Pull the latest tagged posts" : "Connect Instagram first"}
      onClick={() =>
        start(async () => {
          const r = await syncMentionsNow();
          if (!r.ok) { toast.error(r.error); return; }
          toast.success(
            r.created > 0
              ? `${r.created} new mention${r.created === 1 ? "" : "s"} pulled in.`
              : `Up to date — ${r.fetched} tagged posts checked.`,
          );
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      Sync now
    </Button>
  );
}

export function MentionsInboxClient({ rows }: { rows: MentionRow[] }) {
  return (
    <ul className="divide-y divide-white/[0.04]">
      {rows.map((m) => (
        <MentionItem key={m.id} m={m} />
      ))}
    </ul>
  );
}

function MentionItem({ m }: { m: MentionRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, done: (r: Record<string, unknown>) => void) {
    setBusy(label);
    start(async () => {
      try {
        const r = await fn();
        if (!r.ok) { toast.error(r.error ?? "Something went wrong."); return; }
        done(r);
        router.refresh();
      } finally {
        setBusy(null);
      }
    });
  }

  const Spinner = ({ id, icon: Icon }: { id: string; icon: React.ComponentType<{ className?: string }> }) =>
    busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />;

  return (
    <li className="py-3 flex gap-3">
      <div className="h-9 w-9 shrink-0 rounded-full border border-ember-500/30 bg-ember-500/10 flex items-center justify-center text-ember-200 text-sm font-semibold uppercase">
        {m.username[0]}
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <a
            href={`https://instagram.com/${m.username}`}
            target="_blank"
            rel="noreferrer"
            className="text-ivory font-medium hover:text-ember-200 truncate"
          >
            @{m.username}
          </a>
          <Badge variant="outline" className="text-[9px]">{SOURCE_LABEL[m.source]}</Badge>
          {m.influencer && (
            <Link href={`/influencers/${m.influencer.id}`}>
              <Badge variant="gold" className="text-[9px]">
                <Megaphone className="h-2.5 w-2.5 mr-1" />
                {m.influencer.name}
              </Badge>
            </Link>
          )}
          {m.prospect && (
            <Link href={`/prospects/${m.prospect.id}`}>
              <Badge variant="secondary" className="text-[9px]">
                <Store className="h-2.5 w-2.5 mr-1" />
                {m.prospect.name}
              </Badge>
            </Link>
          )}
          {m.loggedPostId && <Badge variant="success" className="text-[9px]">Logged</Badge>}
          {m.status === "DISMISSED" && <Badge variant="outline" className="text-[9px] opacity-60">Dismissed</Badge>}
        </div>
        {m.caption && (
          <p className="text-xs text-ivory/80 line-clamp-2 break-words">{m.caption}</p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground tabular-nums flex-wrap">
          <span>{fmtWhen(m.postedAt)}</span>
          {m.likeCount != null && (
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{m.likeCount.toLocaleString()}</span>
          )}
          {m.commentCount != null && (
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{m.commentCount.toLocaleString()}</span>
          )}
          {m.permalink && (
            <a href={m.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ember-200 hover:underline">
              <ExternalLink className="h-3 w-3" /> View on Instagram
            </a>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {!m.influencer && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() =>
                run("inf", () => addInfluencerFromMention(m.id), (r) =>
                  toast.success(r.created ? "Influencer added." : "Linked to the existing influencer."),
                )
              }
            >
              <Spinner id="inf" icon={UserPlus} /> Add influencer
            </Button>
          )}
          {!m.prospect && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() =>
                run("pro", () => addProspectFromMention(m.id), (r) =>
                  toast.success(r.created ? "Prospect added — rename it once you confirm the business." : "Linked to the existing prospect."),
                )
              }
            >
              <Spinner id="pro" icon={Store} /> Add prospect
            </Button>
          )}
          {m.influencer && !m.loggedPostId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              disabled={pending}
              onClick={() => run("log", () => logMentionAsPost(m.id), () => toast.success("Logged on their profile."))}
            >
              <Spinner id="log" icon={Megaphone} /> Log as post
            </Button>
          )}
          {m.status === "NEW" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                disabled={pending}
                onClick={() => run("rev", () => setMentionStatus(m.id, "REVIEWED"), () => undefined)}
              >
                <Spinner id="rev" icon={CheckCircle2} /> Reviewed
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                disabled={pending}
                onClick={() => run("dis", () => setMentionStatus(m.id, "DISMISSED"), () => undefined)}
              >
                <Spinner id="dis" icon={EyeOff} /> Dismiss
              </Button>
            </>
          )}
          {m.status !== "NEW" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              disabled={pending}
              onClick={() => run("reopen", () => setMentionStatus(m.id, "NEW"), () => undefined)}
            >
              <Spinner id="reopen" icon={RotateCcw} /> Reopen
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
