import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Star,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge, VerdictBadge } from "@/components/prospects/score-badge";
import { ProspectProfileActions } from "@/components/prospects/prospect-profile-actions";
import {
  ProspectActivityClient,
  type ActivityRow,
} from "@/components/prospects/prospect-activity-client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/auth";
import { n } from "@/server/sales";
import type { ProspectBriefing } from "@/server/ai/prospecting";

export const metadata = { title: "Prospect" };
export const dynamic = "force-dynamic";
// AI actions (analysis ~10s each, batches up to 5) need a longer budget
export const maxDuration = 60;

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const p = await prisma.prospect.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { fullName: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { createdBy: { select: { fullName: true, email: true } } },
      },
    },
  });
  if (!p) notFound();

  const briefing = (p.aiBriefing ?? null) as ProspectBriefing | null;
  const activities: ActivityRow[] = p.activities.map((a) => ({
    id: a.id,
    kind: a.kind,
    summary: a.summary,
    detail: a.detail,
    dueAt: a.dueAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    actor: a.createdBy?.fullName ?? a.createdBy?.email ?? null,
  }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground -ml-2">
        <Link href="/prospects">
          <ArrowLeft className="h-4 w-4" /> All prospects
        </Link>
      </Button>

      {/* Header */}
      <div className="rounded-xl border border-white/[0.06] bg-ink-900/40 p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="pt-1">
              <ScoreBadge score={p.aiScore} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl text-ivory truncate">
                  {p.businessName}
                </h1>
                <VerdictBadge verdict={p.aiVerdict} />
                {p.aiPriority && (
                  <Badge
                    variant={p.aiPriority === "HIGH" ? "gold" : "outline"}
                    className="text-[10px]"
                  >
                    {p.aiPriority.toLowerCase()} priority
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[p.businessType, [p.city, p.state].filter(Boolean).join(", ")]
                  .filter(Boolean)
                  .join(" · ") || "No details yet"}
                {p.googleRating != null && (
                  <span className="ml-2 text-ember-200">
                    <Star className="h-3 w-3 inline -mt-0.5" /> {p.googleRating}
                    {p.reviewCount != null && ` (${p.reviewCount})`}
                  </span>
                )}
              </p>
              {p.aiDna.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.aiDna.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-ember-500/25 bg-ember-500/[0.06] px-2 py-0.5 text-[10px] text-ember-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <ProspectProfileActions
          prospectId={p.id}
          stage={p.stage}
          hasAnalysis={Boolean(p.aiAnalyzedAt)}
          customerId={p.customerId}
        />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left: AI briefing + activity */}
        <div className="space-y-6">
          {briefing ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ember-300" />
                  AI sales briefing
                </CardTitle>
                {p.aiScoreReason && (
                  <p className="text-xs text-muted-foreground pt-1">{p.aiScoreReason}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <Section title="Overview" body={briefing.overview} />
                <Section title="Customer profile" body={briefing.customerProfile} />

                {/* Estimates */}
                <div className="grid grid-cols-3 gap-3">
                  <Tile label="Est. first order" value={p.aiFirstOrderEst != null ? fmtUsd(n(p.aiFirstOrderEst)) : "—"} />
                  <Tile label="Est. annual" value={p.aiAnnualEst != null ? fmtUsd(n(p.aiAnnualEst)) : "—"} />
                  <Tile label="Win probability" value={p.aiWinProbability != null ? `${p.aiWinProbability}%` : "—"} />
                </div>

                {/* SWOT */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <ListBlock title="Strengths" items={briefing.strengths} tone="text-emerald-300" />
                  <ListBlock title="Weaknesses" items={briefing.weaknesses} tone="text-amber-300" />
                  <ListBlock title="Opportunities" items={briefing.opportunities} tone="text-ember-200" />
                  <ListBlock title="Risks" items={briefing.risks} tone="text-red-300" />
                </div>

                <Section title="Recommended approach" body={briefing.salesApproach} />
                <ListBlock title="Conversation starters" items={briefing.conversationStarters} />
                <ListBlock title="Lead with" items={briefing.suggestedProducts} />
                <ListBlock title="Likely objections" items={briefing.likelyObjections} />
                {briefing.followUpCadence && (
                  <Section title="Follow-up cadence" body={briefing.followUpCadence} />
                )}
                {briefing.eventOpportunities.length > 0 && (
                  <ListBlock title="Event opportunities" items={briefing.eventOpportunities} />
                )}
                <ListBlock title="Next actions" items={briefing.nextActions} tone="text-ivory" />

                {p.aiAnalyzedAt && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Generated {p.aiAnalyzedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} from the data on file — AI knowledge, verify before quoting specifics.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-10 text-center space-y-2">
                <Sparkles className="h-7 w-7 mx-auto text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">
                  No AI analysis yet. Run it to get a compatibility score,
                  lounge DNA, and a full sales briefing.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ProspectActivityClient prospectId={p.id} activities={activities} />
            </CardContent>
          </Card>
        </div>

        {/* Right: business info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Info icon={MapPin}>
                {[p.street, p.city, p.state, p.zipCode].filter(Boolean).join(", ") || "—"}
              </Info>
              <Info icon={Phone}>{p.phone ?? "—"}</Info>
              <Info icon={Mail}>{p.email ?? "—"}</Info>
              <Info icon={Globe}>
                {p.website ? (
                  <a href={p.website} target="_blank" rel="noreferrer" className="hover:text-ember-200 break-all">
                    {p.website}
                  </a>
                ) : (
                  "—"
                )}
              </Info>
              <Info icon={Instagram}>
                {p.instagram ? (
                  <a href={p.instagram} target="_blank" rel="noreferrer" className="hover:text-ember-200 break-all">
                    {p.instagram}
                  </a>
                ) : (
                  "—"
                )}
              </Info>
              {p.businessHours && (
                <div className="text-xs text-muted-foreground pt-1">{p.businessHours}</div>
              )}
              {p.description && (
                <p className="text-xs text-ivory/80 pt-1 whitespace-pre-wrap">{p.description}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <KV label="Owner" value={p.ownerName ?? "—"} />
              <KV label="Buyer" value={p.buyerName ?? "—"} />
              <KV label="Manager" value={p.managerName ?? "—"} />
              <KV label="Contact phone" value={p.contactPhone ?? "—"} />
              <KV label="Contact email" value={p.contactEmail ?? "—"} />
              <KV label="Prefers" value={p.preferredContact ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <KV label="Humidor" value={p.humidorSize ?? "—"} />
              <KV label="Foot traffic" value={p.footTraffic ?? "—"} />
              <KV label="Demographic" value={p.demographic ?? "—"} />
              <KV label="Locations" value={p.locationCount?.toString() ?? "—"} />
              <KV label="Territory" value={p.territory ?? "—"} />
              <KV
                label="Assigned to"
                value={p.assignedTo?.fullName ?? p.assignedTo?.email ?? "Unassigned"}
              />
              {p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {p.tags.map((t) => (
                    <Badge key={t} variant="gold" className="text-[9px]">{t}</Badge>
                  ))}
                </div>
              )}
              {p.notes && (
                <p className="text-xs text-ivory/80 pt-2 whitespace-pre-wrap border-l-2 border-ember-500/30 pl-3">
                  {p.notes}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (!body) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
      <p className="text-sm text-ivory/90 leading-relaxed">{body}</p>
    </div>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: string;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-wider mb-1 ${tone ?? "text-muted-foreground"}`}>
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-ivory/85 flex gap-2">
            <span className="text-ember-300/70">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.05] bg-ink-900/40 p-3">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg text-ember-200 tabular-nums">{value}</div>
    </div>
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
