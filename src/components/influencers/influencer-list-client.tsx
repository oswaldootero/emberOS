"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfluencerStageBadge, fmtFollowers } from "./stage-badge";
import type { InfluencerListRow } from "@/server/influencers";
import {
  bulkDeleteInfluencers,
  setInfluencerStage,
} from "@/server/actions/influencers";

const STAGE_OPTIONS = [
  "PROSPECT",
  "CONTACTED",
  "IN_CONVERSATION",
  "AGREED",
  "CIGARS_SENT",
  "ACTIVE_PARTNER",
  "INACTIVE",
  "DECLINED",
] as const;

const prettyStage = (s: string) =>
  s.toLowerCase().split("_").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

/** Column header that toggles sort via the ?sort=field:dir URL param. */
function SortableTh({
  label,
  field,
  defaultDir,
  className,
}: {
  label: string;
  field: string;
  defaultDir: "asc" | "desc";
  className?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [curField, curDir] = (sp.get("sort") ?? "").split(":");
  const active = curField === field;

  function toggle() {
    const nextDir = active ? (curDir === "desc" ? "asc" : "desc") : defaultDir;
    const params = new URLSearchParams(sp.toString());
    params.set("sort", `${field}:${nextDir}`);
    params.delete("page");
    router.push(`/influencers?${params.toString()}`);
  }

  return (
    <th className={`text-left font-normal py-2 px-2 ${className ?? ""}`}>
      <button
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-ivory transition ${
          active ? "text-ember-200" : ""
        }`}
      >
        {label}
        {active ? (
          curDir === "asc" ? (
            <ArrowUp className="h-2.5 w-2.5" />
          ) : (
            <ArrowDown className="h-2.5 w-2.5" />
          )
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 opacity-30" />
        )}
      </button>
    </th>
  );
}

export function InfluencerListClient({
  rows,
  isAdmin,
}: {
  rows: InfluencerListRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function runBulkDelete() {
    const ids = Array.from(selected);
    if (!confirm(`Permanently delete ${ids.length} influencer${ids.length === 1 ? "" : "s"}? Their shipment and post history goes too.`)) return;
    startTransition(async () => {
      const r = await bulkDeleteInfluencers(ids);
      if (!r.ok) toast.error(r.error);
      else {
        toast.success(`${r.id} deleted.`);
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 py-2 border-b border-white/[0.05] flex-wrap">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() =>
            setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
          }
          aria-label="Select all influencers on this page"
          className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
        />
        {selected.size > 0 ? (
          <>
            <span className="text-[11px] text-ivory">{selected.size} selected</span>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={runBulkDelete}
                className="text-red-300 hover:text-red-200 border-red-500/30"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-muted-foreground">
              <X className="h-3 w-3" /> Clear
            </Button>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Select influencers for bulk actions
          </span>
        )}
      </div>

      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-white/[0.05]">
              <th className="py-2 px-2 w-8" />
              <SortableTh label="Followers" field="followerCount" defaultDir="desc" />
              <SortableTh label="Influencer" field="name" defaultDir="asc" />
              <th className="text-left font-normal py-2 px-2 hidden md:table-cell">Niche</th>
              <SortableTh label="Stage" field="stage" defaultDir="asc" />
              <SortableTh label="Cigars sent" field="shipments" defaultDir="desc" />
              <SortableTh label="Posts" field="posts" defaultDir="desc" />
              <th className="text-left font-normal py-2 px-2 hidden lg:table-cell">Last post</th>
              <SortableTh label="Follow-up" field="nextFollowupDate" defaultDir="asc" className="hidden md:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((inf) => (
              <tr key={inf.id} className="hover:bg-white/[0.02] transition">
                <td className="py-2.5 px-2">
                  <input
                    type="checkbox"
                    checked={selected.has(inf.id)}
                    onChange={(e) => toggle(inf.id, e.target.checked)}
                    aria-label={`Select ${inf.name}`}
                    className="h-4 w-4 rounded border-white/20 bg-transparent accent-[#c69437] cursor-pointer"
                  />
                </td>
                <td className="py-2.5 px-2">
                  <span className="inline-flex items-center justify-center h-7 min-w-[2.75rem] px-1.5 rounded-md text-xs font-semibold tabular-nums border border-ember-500/40 bg-ember-500/10 text-ember-200">
                    {fmtFollowers(inf.followerCount)}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <Link href={`/influencers/${inf.id}`} className="text-ivory hover:text-ember-200">
                    {inf.name}
                  </Link>
                  <div className="text-[10px] text-muted-foreground">
                    {inf.handle ? `@${inf.handle}` : "—"}
                    {inf.platform !== "Instagram" && ` · ${inf.platform}`}
                    {inf.location && ` · ${inf.location}`}
                  </div>
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell max-w-[160px] truncate">
                  {inf.niche ?? "—"}
                </td>
                <td className="py-2.5 px-2">
                  <Select
                    value={inf.stage}
                    onValueChange={(v) =>
                      startTransition(async () => {
                        const r = await setInfluencerStage(inf.id, v as "PROSPECT");
                        if (!r.ok) toast.error(r.error);
                        else router.refresh();
                      })
                    }
                  >
                    <SelectTrigger className="border-0 bg-transparent h-auto p-0 shadow-none w-fit gap-1 hover:opacity-80">
                      <SelectValue asChild>
                        <span><InfluencerStageBadge stage={inf.stage} /></span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{prettyStage(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2.5 px-2 text-xs tabular-nums">
                  {inf.cigarsSent > 0 ? (
                    <span className="text-ivory">
                      {inf.cigarsSent}
                      <span className="text-muted-foreground"> in {inf.shipmentCount} box{inf.shipmentCount === 1 ? "" : "es"}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-xs tabular-nums">
                  {inf.postCount > 0 ? (
                    <span className="text-ivory">{inf.postCount}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden lg:table-cell">
                  {inf.lastPostAt
                    ? new Date(inf.lastPostAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
                    : "—"}
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground hidden md:table-cell">
                  {inf.nextFollowupDate
                    ? new Date(inf.nextFollowupDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
