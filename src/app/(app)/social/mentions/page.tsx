import Link from "next/link";
import { AtSign, Inbox, Megaphone, ScanSearch, Store } from "lucide-react";
import type { SocialMentionStatus } from "@prisma/client";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/data-table";
import {
  MentionsInboxClient,
  SyncMentionsButton,
  type MentionRow,
} from "@/components/social/mentions-inbox-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { instagramConfigured } from "@/server/integrations/meta";
import { cn } from "@/lib/utils";

export const metadata = { title: "Mentions inbox" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const STATUSES: { value: SocialMentionStatus | "ALL"; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "DISMISSED", label: "Dismissed" },
  { value: "ALL", label: "All" },
];

export default async function MentionsInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const status = (STATUSES.find((s) => s.value === sp.status)?.value ?? "NEW") as
    | SocialMentionStatus
    | "ALL";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = status === "ALL" ? {} : { status };
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [rows, total, newCount, weekCount, linkedCount, allCount] = await Promise.all([
    prisma.socialMention.findMany({
      where,
      orderBy: { postedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        influencer: { select: { id: true, name: true } },
        prospect: { select: { id: true, businessName: true } },
      },
    }),
    prisma.socialMention.count({ where }),
    prisma.socialMention.count({ where: { status: "NEW" } }),
    prisma.socialMention.count({ where: { postedAt: { gte: weekAgo } } }),
    prisma.socialMention.count({ where: { influencerId: { not: null } } }),
    prisma.socialMention.count(),
  ]);

  const configured = instagramConfigured();
  const mentionRows: MentionRow[] = rows.map((m) => ({
    id: m.id,
    source: m.source,
    username: m.username,
    caption: m.caption,
    permalink: m.permalink,
    mediaType: m.mediaType,
    likeCount: m.likeCount,
    commentCount: m.commentCount,
    postedAt: m.postedAt.toISOString(),
    status: m.status,
    influencer: m.influencer,
    prospect: m.prospect ? { id: m.prospect.id, name: m.prospect.businessName } : null,
    loggedPostId: m.loggedPostId,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Social scouting"
        title="Mentions inbox"
        description="Everyone who tags or mentions Heaven's Leaf on Instagram — your warmest leads, in one feed."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/social/lookup">
            <ScanSearch className="h-4 w-4" /> Handle lookup
          </Link>
        </Button>
        <SyncMentionsButton configured={configured} />
      </PageHeader>

      {!configured && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-4 text-sm text-ivory space-y-1">
          <div className="font-medium">Instagram isn&apos;t connected yet.</div>
          <p className="text-xs text-muted-foreground">
            Mentions will start flowing once the Meta app is set up and the env vars are in place.
            The walkthrough lives in <span className="font-mono">docs/SOCIAL-SCOUTING.md</span>; connection
            status is on the <Link href="/settings" className="text-ember-200 hover:underline">Settings</Link> page.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Inbox} label="New" value={String(newCount)} accent={newCount > 0 ? "text-ember-200" : undefined} />
        <Kpi icon={AtSign} label="Last 7 days" value={String(weekCount)} />
        <Kpi icon={Megaphone} label="From tracked influencers" value={String(linkedCount)} />
        <Kpi icon={Store} label="All time" value={String(allCount)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Mentions</CardTitle>
            <div className="flex items-center gap-1 flex-wrap">
              {STATUSES.map((s) => (
                <Link
                  key={s.value}
                  href={s.value === "NEW" ? "/social/mentions" : `/social/mentions?status=${s.value}`}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs border",
                    status === s.value
                      ? "border-ember-500/40 bg-ember-500/10 text-ember-200"
                      : "border-white/10 text-muted-foreground hover:text-ivory",
                  )}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {mentionRows.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <AtSign className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">
                {status === "NEW"
                  ? "Nothing new. Tags arrive on the six-hour sync or with Sync now; caption and comment mentions arrive instantly by webhook."
                  : "No mentions match this filter."}
              </p>
            </div>
          ) : (
            <>
              <MentionsInboxClient rows={mentionRows} />
              <div className="pt-4">
                <Pagination
                  page={page}
                  pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                  total={total}
                  basePath="/social/mentions"
                  baseQuery={{ status: status === "NEW" ? undefined : status }}
                  noun="mentions"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className={cn("h-4 w-4", accent ?? "text-ember-300/80")} />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </div>
        <div className={cn("font-display text-3xl tracking-tight tabular-nums", accent ?? "text-ivory")}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
