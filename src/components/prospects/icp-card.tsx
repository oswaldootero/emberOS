"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Loader2, Save, Star } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ICP_CRITERIA,
  ICP_MAX_SCORE,
  computeIcpScore,
  icpTier,
  type IcpAnswers,
  type IcpAnswerValue,
  type IcpCriterion,
} from "@/lib/icp";
import { saveIcpAssessment } from "@/server/actions/prospects";

const HUMIDOR_SIZES = ["small", "medium", "large", "walk-in"];

export type IcpDetails = {
  currentBrands: string;
  humidorSize: string;
  facingsCount: string;
  loungeSeats: string;
  locationCount: string;
  decisionMakerName: string;
  decisionMakerRole: string;
  lastVisitDate: string;
  nextFollowupDate: string;
  icpNotes: string;
};

export function IcpCard({
  prospectId,
  initialAnswers,
  initialDetails,
  scoredAt,
}: {
  prospectId: string;
  initialAnswers: IcpAnswers;
  initialDetails: IcpDetails;
  scoredAt: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<IcpAnswers>(initialAnswers);
  const [details, setDetails] = useState<IcpDetails>(initialDetails);
  const [dirty, setDirty] = useState(false);

  const { score, answered, total } = useMemo(() => computeIcpScore(answers), [answers]);
  const tier = answered > 0 ? icpTier(score) : null;

  function setAnswer(key: string, value: IcpAnswerValue | null) {
    setDirty(true);
    setAnswers((prev) => {
      const next = { ...prev };
      if (value == null) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  const setDetail = (patch: Partial<IcpDetails>) => {
    setDirty(true);
    setDetails((prev) => ({ ...prev, ...patch }));
  };

  function save() {
    startTransition(async () => {
      const r = await saveIcpAssessment(prospectId, answers, {
        currentBrands: details.currentBrands || null,
        humidorSize: details.humidorSize || null,
        facingsCount: details.facingsCount ? Number(details.facingsCount) : null,
        loungeSeats: details.loungeSeats ? Number(details.loungeSeats) : null,
        locationCount: details.locationCount ? Number(details.locationCount) : null,
        decisionMakerName: details.decisionMakerName || null,
        decisionMakerRole: details.decisionMakerRole || null,
        lastVisitDate: details.lastVisitDate || null,
        nextFollowupDate: details.nextFollowupDate || null,
        icpNotes: details.icpNotes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setDirty(false);
      toast.success(`ICP saved — ${r.score}/${ICP_MAX_SCORE}.`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-ember-300" />
              Ideal Customer Profile (ICP)
            </CardTitle>
            <CardDescription>
              Answer what you know — the score updates as you go.
              {scoredAt && !dirty && (
                <span className="ml-1">
                  Last scored{" "}
                  {new Date(scoredAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  .
                </span>
              )}
            </CardDescription>
          </div>
          {/* Live score */}
          <div className="text-right">
            <div
              className={cn(
                "font-display text-3xl tabular-nums",
                tier ? tier.textClass : "text-muted-foreground",
              )}
            >
              {answered > 0 ? score : "—"}
              <span className="text-sm text-muted-foreground"> / {ICP_MAX_SCORE}</span>
            </div>
            {tier ? (
              <div className={cn("text-xs font-medium", tier.textClass)}>{tier.rating}</div>
            ) : (
              <div className="text-[10px] text-muted-foreground">not assessed</div>
            )}
            <div className="text-[10px] text-muted-foreground">
              {answered}/{total} answered
            </div>
          </div>
        </div>
        {tier && (
          <div className="rounded-md border border-white/[0.06] bg-ink-900/40 px-3 py-2 text-xs text-ivory/90 flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full shrink-0", tier.dotClass)} />
            <span>
              <span className="text-muted-foreground">Next action:</span> {tier.nextAction}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Criteria checklist */}
        <div className="divide-y divide-white/[0.04]">
          {ICP_CRITERIA.map((c) => (
            <CriterionRow
              key={c.key}
              criterion={c}
              value={answers[c.key] ?? null}
              onChange={(v) => setAnswer(c.key, v)}
            />
          ))}
        </div>

        {/* Additional capture fields */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            Account details
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <F label="Current brands carried" value={details.currentBrands} onChange={(x) => setDetail({ currentBrands: x })} placeholder="Padrón, Oliva…" />
            <div className="space-y-2">
              <Label>Estimated humidor size</Label>
              <Select
                value={details.humidorSize || "none"}
                onValueChange={(x) => setDetail({ humidorSize: x === "none" ? "" : x })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {HUMIDOR_SIZES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumF label="Facings available" value={details.facingsCount} onChange={(x) => setDetail({ facingsCount: x })} />
            <NumF label="Lounge seats" value={details.loungeSeats} onChange={(x) => setDetail({ loungeSeats: x })} />
            <NumF label="Retail locations" value={details.locationCount} onChange={(x) => setDetail({ locationCount: x })} />
            <F label="Decision maker" value={details.decisionMakerName} onChange={(x) => setDetail({ decisionMakerName: x })} />
            <F label="Decision maker role" value={details.decisionMakerRole} onChange={(x) => setDetail({ decisionMakerRole: x })} placeholder="Owner, buyer…" />
            <div className="space-y-2">
              <Label>Last visit</Label>
              <Input type="date" value={details.lastVisitDate} onChange={(e) => setDetail({ lastVisitDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Next follow-up</Label>
              <Input type="date" value={details.nextFollowupDate} onChange={(e) => setDetail({ nextFollowupDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <Label>ICP notes</Label>
            <Textarea
              value={details.icpNotes}
              onChange={(e) => setDetail({ icpNotes: e.target.value })}
              rows={2}
              placeholder="Anything worth remembering from the visit…"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {dirty && (
            <span className="text-[11px] text-amber-300">Unsaved changes</span>
          )}
          <Button variant="gold" size="sm" onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save assessment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CriterionRow({
  criterion: c,
  value,
  onChange,
}: {
  criterion: IcpCriterion;
  value: IcpAnswerValue | null;
  onChange: (v: IcpAnswerValue | null) => void;
}) {
  return (
    <div className="py-2.5 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="text-sm text-ivory">{c.label}</div>
        <div className="text-[10px] text-muted-foreground">{c.weight} pts</div>
      </div>
      {c.kind === "boolean" && (
        <div className="flex gap-1">
          <Seg active={value === true} onClick={() => onChange(value === true ? null : true)}>
            Yes
          </Seg>
          <Seg active={value === false} onClick={() => onChange(value === false ? null : false)}>
            No
          </Seg>
        </div>
      )}
      {c.kind === "tri" && c.triLabels && (
        <div className="flex gap-1">
          {c.triLabels.map((l) => (
            <Seg key={l} active={value === l} onClick={() => onChange(value === l ? null : l)}>
              {l}
            </Seg>
          ))}
        </div>
      )}
      {c.kind === "scale5" && (
        <div className="flex gap-0.5" role="radiogroup" aria-label={c.label}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`${s} of 5`}
              onClick={() => onChange(value === s ? null : s)}
              className="p-0.5 group"
            >
              <Star
                className={cn(
                  "h-4 w-4 transition",
                  typeof value === "number" && s <= value
                    ? "text-ember-300 fill-ember-300"
                    : "text-white/20 group-hover:text-white/40",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[11px] transition",
        active
          ? "border-ember-500/50 bg-ember-500/15 text-ember-200"
          : "border-white/10 text-muted-foreground hover:text-ivory hover:border-white/25",
      )}
    >
      {children}
    </button>
  );
}

function F({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function NumF({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
