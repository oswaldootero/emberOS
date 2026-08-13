import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  ExternalLink,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfluencerStageBadge, fmtFollowers } from "@/components/influencers/stage-badge";
import { InfluencerProfileActions } from "@/components/influencers/influencer-profile-actions";
import {
  PostTracker,
  ShipmentTracker,
  type PostRow,
  type ShipmentRow,
} from "@/components/influencers/influencer-tracking-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { n } from "@/server/sales";

export const metadata = { title: "Influencer" };
export const dynamic = "force-dynamic";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function InfluencerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const inf = await prisma.influencer.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { fullName: true, email: true } },
      shipments: {
        orderBy: { sentAt: "desc" },
        take: 100,
        include: { createdBy: { select: { fullName: true, email: true } } },
      },
      posts: {
        orderBy: { postedAt: "desc" },
        take: 100,
        include: { createdBy: { select: { fullName: true, email: true } } },
      },
    },
  });
  if (!inf) notFound();

  const shipments: ShipmentRow[] = inf.shipments.map((s) => ({
    id: s.id,
    sentAt: s.sentAt.toISOString(),
    cigarCount: s.cigarCount,
    contents: s.contents,
    costUsd: s.costUsd != null ? n(s.costUsd) : null,
    carrier: s.carrier,
    trackingNumber: s.trackingNumber,
    notes: s.notes,
    actor: s.createdBy?.fullName ?? s.createdBy?.email ?? null,
  }));
  const posts: PostRow[] = inf.posts.map((p) => ({
    id: p.id,
    postedAt: p.postedAt.toISOString(),
    type: p.type,
    url: p.url,
    caption: p.caption,
    likes: p.likes,
    comments: p.comments,
    views: p.views,
    notes: p.notes,
    actor: p.createdBy?.fullName ?? p.createdBy?.email ?? null,
  }));

  const cigarsSent = shipments.reduce((s, x) => s + x.cigarCount, 0);
  const costInvested = shipments.reduce((s, x) => s + (x.costUsd ?? 0), 0);
  const profileUrl =
    inf.profileUrl ??
    (inf.handle && inf.platform === "Instagram"
      ? `https://instagram.com/${inf.handle}`
      : null);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/influencers">
          <ArrowLeft className="h-4 w-4" /> All influencers
        </Link>
      </Button>

      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="pt-1">
              <span className="inline-flex items-center justify-center h-10 min-w-[3.25rem] px-2 rounded-md text-sm font-semibold tabular-nums border border-ember-500/40 bg-ember-500/10 text-ember-200">
                {fmtFollowers(inf.followerCount)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl text-ivory truncate">{inf.name}</h1>
                <InfluencerStageBadge stage={inf.stage} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {profileUrl && inf.handle ? (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ember-200 hover:underline"
                  >
                    @{inf.handle}
                  </a>
                ) : inf.handle ? (
                  `@${inf.handle}`
                ) : null}
                {[inf.platform, inf.niche, inf.location]
                  .filter(Boolean)
                  .map((x) => ` · ${x}`)
                  .join("")}
              </p>
              {inf.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {inf.tags.map((t) => (
                    <Badge key={t} variant="gold" className="text-[9px]">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <InfluencerProfileActions
          influencerId={inf.id}
          name={inf.name}
          stage={inf.stage}
          isAdmin={user.role === "ADMIN"}
        />
      </div>

      {/* Seeding scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Cigars sent" value={String(cigarsSent)} />
        <Tile label="Shipments" value={String(shipments.length)} />
        <Tile label="Posts logged" value={String(posts.length)} />
        <Tile label="Cost invested" value={costInvested > 0 ? fmtUsd(costInvested) : "—"} />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left: shipments + posts */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-ember-300" />
                Cigar shipments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ShipmentTracker influencerId={inf.id} shipments={shipments} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-ember-300" />
                Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PostTracker influencerId={inf.id} posts={posts} />
            </CardContent>
          </Card>
        </div>

        {/* Right: profile info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <KV label="Platform" value={inf.platform} />
              <KV label="Followers" value={inf.followerCount?.toLocaleString() ?? "—"} />
              <KV label="Following" value={inf.followingCount?.toLocaleString() ?? "—"} />
              <KV label="Lifetime posts" value={inf.postCount?.toLocaleString() ?? "—"} />
              <KV label="Niche" value={inf.niche ?? "—"} />
              {inf.bio && (
                <p className="text-xs text-ivory/80 pt-1 whitespace-pre-wrap border-l-2 border-ember-500/30 pl-3">
                  {inf.bio}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Info icon={AtSign}>
                {profileUrl ? (
                  <a href={profileUrl} target="_blank" rel="noreferrer" className="hover:text-ember-200 break-all inline-flex items-center gap-1">
                    {profileUrl.replace(/^https?:\/\//, "")} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  "—"
                )}
              </Info>
              <Info icon={Mail}>{inf.email ?? "—"}</Info>
              <Info icon={Phone}>{inf.phone ?? "—"}</Info>
              <Info icon={MapPin}>{inf.location ?? "—"}</Info>
              {inf.otherSocials && (
                <div className="text-xs text-muted-foreground pt-1">{inf.otherSocials}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relationship</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <KV
                label="Last contact"
                value={
                  inf.lastContactDate
                    ? inf.lastContactDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"
                }
              />
              <KV
                label="Next follow-up"
                value={
                  inf.nextFollowupDate
                    ? inf.nextFollowupDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
                    : "—"
                }
              />
              <KV
                label="Assigned to"
                value={inf.assignedTo?.fullName ?? inf.assignedTo?.email ?? "Unassigned"}
              />
              {inf.agreementTerms && (
                <div className="pt-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Agreement
                  </div>
                  <p className="text-xs text-ivory/80 whitespace-pre-wrap">{inf.agreementTerms}</p>
                </div>
              )}
              {inf.notes && (
                <p className="text-xs text-ivory/80 pt-2 whitespace-pre-wrap border-l-2 border-ember-500/30 pl-3">
                  {inf.notes}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-display text-2xl text-ember-200 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function Info({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-ivory/90 min-w-0 text-xs">{children}</span>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-ivory text-right">{value}</span>
    </div>
  );
}
