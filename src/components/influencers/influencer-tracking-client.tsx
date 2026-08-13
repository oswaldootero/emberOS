"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Package, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
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
import {
  addInfluencerPost,
  addInfluencerShipment,
  deleteInfluencerPost,
  deleteInfluencerShipment,
} from "@/server/actions/influencers";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const today = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────
// Shipments
// ─────────────────────────────────────────────────────────────────

export type ShipmentRow = {
  id: string;
  sentAt: string;
  cigarCount: number;
  contents: string | null;
  costUsd: number | null;
  carrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  actor: string | null;
};

export function ShipmentTracker({
  influencerId,
  shipments,
}: {
  influencerId: string;
  shipments: ShipmentRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sentAt, setSentAt] = useState(today());
  const [cigarCount, setCigarCount] = useState("");
  const [contents, setContents] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const count = Number(cigarCount);
    if (!Number.isInteger(count) || count <= 0) {
      toast.error("How many cigars went in the box?");
      return;
    }
    startTransition(async () => {
      const r = await addInfluencerShipment(influencerId, {
        sentAt: sentAt || null,
        cigarCount: count,
        contents: contents || null,
        costUsd: costUsd ? Number(costUsd) : null,
        carrier: carrier || null,
        trackingNumber: trackingNumber || null,
        notes: notes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Shipment logged.");
      setOpen(false);
      setCigarCount("");
      setContents("");
      setCostUsd("");
      setCarrier("");
      setTrackingNumber("");
      setNotes("");
      setSentAt(today());
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this shipment?")) return;
    startTransition(async () => {
      const r = await deleteInfluencerShipment(id);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!open && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Log shipment
        </Button>
      )}

      {open && (
        <form onSubmit={submit} className="rounded-lg border border-white/[0.08] bg-ink-900/40 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sent on</Label>
              <Input type="date" value={sentAt} onChange={(e) => setSentAt(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cigars *</Label>
              <Input
                type="number"
                min={1}
                value={cigarCount}
                onChange={(e) => setCigarCount(e.target.value)}
                placeholder="5"
                className="h-8 text-xs"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost (USD)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={costUsd}
                onChange={(e) => setCostUsd(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Carrier</Label>
              <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="USPS" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Tracking #</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">What went in the box</Label>
            <Input value={contents} onChange={(e) => setContents(e.target.value)} placeholder="2× Genesis, 3× Redemption…" className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="gold" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
              Log shipment
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </form>
      )}

      {shipments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No cigars sent yet.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {shipments.map((s) => (
            <li key={s.id} className="py-2.5 flex items-start gap-3 group">
              <Package className="h-3.5 w-3.5 text-ember-300/80 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-ivory">
                  <span className="font-semibold tabular-nums">{s.cigarCount} cigar{s.cigarCount === 1 ? "" : "s"}</span>
                  {" · "}{fmtDate(s.sentAt)}
                  {s.costUsd != null && <span className="text-muted-foreground"> · {fmtUsd(s.costUsd)}</span>}
                </div>
                {s.contents && <div className="text-[11px] text-ivory/70 mt-0.5">{s.contents}</div>}
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {[s.carrier, s.trackingNumber, s.actor].filter(Boolean).join(" · ") || null}
                </div>
                {s.notes && <div className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{s.notes}</div>}
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label="Delete shipment"
                className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-300 pt-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────

const POST_TYPES = [
  "POST",
  "STORY",
  "REEL",
  "VIDEO",
  "LIVE",
  "UNBOXING",
  "REVIEW",
  "GIVEAWAY",
  "MENTION",
  "OTHER",
] as const;

const prettyType = (t: string) => t[0] + t.slice(1).toLowerCase();

export type PostRow = {
  id: string;
  postedAt: string;
  type: string;
  url: string | null;
  caption: string | null;
  likes: number | null;
  comments: number | null;
  views: number | null;
  notes: string | null;
  actor: string | null;
};

export function PostTracker({
  influencerId,
  posts,
}: {
  influencerId: string;
  posts: PostRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [postedAt, setPostedAt] = useState(today());
  const [type, setType] = useState<string>("POST");
  const [url, setUrl] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [views, setViews] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await addInfluencerPost(influencerId, {
        postedAt: postedAt || null,
        type,
        url: url || null,
        likes: likes ? Number(likes) : null,
        comments: comments ? Number(comments) : null,
        views: views ? Number(views) : null,
        notes: notes || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Post logged.");
      setOpen(false);
      setUrl("");
      setLikes("");
      setComments("");
      setViews("");
      setNotes("");
      setType("POST");
      setPostedAt(today());
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    startTransition(async () => {
      const r = await deleteInfluencerPost(id);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {!open && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Log post
        </Button>
      )}

      {open && (
        <form onSubmit={submit} className="rounded-lg border border-white/[0.08] bg-ink-900/40 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Posted on</Label>
              <Input type="date" value={postedAt} onChange={(e) => setPostedAt(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{prettyType(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs">Link</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://instagram.com/p/…" className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Likes</Label>
              <Input type="number" min={0} value={likes} onChange={(e) => setLikes(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comments</Label>
              <Input type="number" min={0} value={comments} onChange={(e) => setComments(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Views</Label>
              <Input type="number" min={0} value={views} onChange={(e) => setViews(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Tagged the brand, great comments…" className="text-xs" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="gold" size="sm" disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Log post
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </form>
      )}

      {posts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Nothing posted yet — log content as it goes live.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {posts.map((p) => (
            <li key={p.id} className="py-2.5 flex items-start gap-3 group">
              <span className="rounded-full border border-ember-500/25 bg-ember-500/[0.06] px-2 py-0.5 text-[10px] text-ember-200 shrink-0 mt-0.5">
                {prettyType(p.type)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-ivory flex items-center gap-1.5 flex-wrap">
                  {fmtDate(p.postedAt)}
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-ember-200 hover:underline"
                    >
                      view <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
                {(p.likes != null || p.comments != null || p.views != null) && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                    {[
                      p.likes != null && `${p.likes.toLocaleString()} likes`,
                      p.comments != null && `${p.comments.toLocaleString()} comments`,
                      p.views != null && `${p.views.toLocaleString()} views`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                {p.notes && <div className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">{p.notes}</div>}
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label="Delete post"
                className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-red-300 pt-0.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
