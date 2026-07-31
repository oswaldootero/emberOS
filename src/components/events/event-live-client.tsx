"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2, Mic, Minus, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  closeEvent,
  getEventSnapshot,
  recordEventSale,
  undoEventSale,
  voiceEventSale,
  type EventSnapshot,
} from "@/server/actions/events";

const fmtUsd = (v: number) =>
  Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: v % 1 === 0 ? 0 : 2,
  }).format(v);

export function EventLiveClient({
  eventId,
  initial,
  hasInventoryLinks,
}: {
  eventId: string;
  initial: EventSnapshot;
  hasInventoryLinks: boolean;
}) {
  const router = useRouter();
  const [snap, setSnap] = useState<EventSnapshot>(initial);
  const [pending, startTransition] = useTransition();
  const [qtyMode, setQtyMode] = useState(1);
  const [closing, setClosing] = useState(false);

  // ── Shared tally: poll every 4s so every phone stays in sync ──
  const refresh = useCallback(async () => {
    const r = await getEventSnapshot(eventId);
    if (r.ok) {
      setSnap(r.snapshot);
      if (r.snapshot.status !== "LIVE") router.refresh();
    }
  }, [eventId, router]);

  useEffect(() => {
    const t = setInterval(() => void refresh(), 4000);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  function sell(itemId: string, label: string, unitPrice: number) {
    const qty = qtyMode;
    setQtyMode(1);
    // Optimistic bump so the tap feels instant
    setSnap((s) => ({
      ...s,
      totalUnits: s.totalUnits + qty,
      totalRevenue: s.totalRevenue + qty * unitPrice,
      items: s.items.map((i) =>
        i.id === itemId
          ? { ...i, sold: i.sold + qty, revenue: i.revenue + qty * unitPrice }
          : i,
      ),
    }));
    startTransition(async () => {
      const r = await recordEventSale(eventId, { itemId, qty });
      if (!r.ok) {
        toast.error(r.error);
        void refresh();
        return;
      }
      toast.success(`${qty > 1 ? `${qty} × ` : ""}${label} — ${fmtUsd(qty * unitPrice)}`, {
        action: { label: "Undo", onClick: () => void undo(r.id) },
        duration: 5000,
      });
      void refresh();
    });
  }

  async function undo(saleId: string) {
    const r = await undoEventSale(saleId);
    if (!r.ok) toast.error(r.error);
    else {
      toast.success("Undone.");
      void refresh();
    }
  }

  function finish(deductInventory: boolean) {
    startTransition(async () => {
      const r = await closeEvent(eventId, { deductInventory });
      if (!r.ok) toast.error(r.error);
      else {
        toast.success("Event closed.");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5 pb-28">
      {/* Running totals */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-ember-500/30 bg-ember-500/[0.05]">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue</div>
            <div className="font-display text-3xl text-ember-200 tabular-nums">
              {fmtUsd(snap.totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Units sold</div>
            <div className="font-display text-3xl text-ivory tabular-nums">{snap.totalUnits}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quantity mode selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Tap sells
        </span>
        <div className="flex items-center rounded-md border border-white/10 overflow-hidden">
          <button
            type="button"
            className="px-2.5 py-1.5 text-ivory hover:bg-white/[0.05]"
            onClick={() => setQtyMode((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="px-3 text-sm font-semibold text-ember-200 tabular-nums min-w-[2ch] text-center">
            {qtyMode}
          </span>
          <button
            type="button"
            className="px-2.5 py-1.5 text-ivory hover:bg-white/[0.05]"
            onClick={() => setQtyMode((q) => Math.min(99, q + 1))}
            aria-label="Increase quantity"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
        {qtyMode > 1 && (
          <span className="text-[11px] text-amber-300">next tap records {qtyMode} units</span>
        )}
      </div>

      {/* Tap tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {snap.items.map((i) => {
          const remaining = i.qtyBrought > 0 ? i.qtyBrought - i.sold : null;
          const out = remaining != null && remaining <= 0;
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => sell(i.id, i.label, i.unitPrice)}
              className={cn(
                "rounded-xl border p-4 text-left transition active:scale-[0.97] select-none",
                out
                  ? "border-red-500/30 bg-red-500/[0.04]"
                  : "border-white/[0.08] bg-ink-900/50 hover:border-ember-500/40 active:bg-ember-500/10",
              )}
            >
              <div className="text-sm font-medium text-ivory leading-tight min-h-[2.4em]">
                {i.label}
              </div>
              <div className="text-ember-200 font-display text-xl tabular-nums mt-1">
                {fmtUsd(i.unitPrice)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums">
                <span className="text-muted-foreground">{i.sold} sold</span>
                {remaining != null && (
                  <span className={cn(out ? "text-red-300" : remaining <= 3 ? "text-amber-300" : "text-muted-foreground")}>
                    {out ? "out" : `${remaining} left`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent sales feed */}
      {snap.recentSales.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground pb-1">
              Recent
            </div>
            {snap.recentSales.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {new Date(s.soldAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="text-ivory truncate">
                  {s.qty > 1 && `${s.qty} × `}
                  {s.itemLabel}
                </span>
                {s.source === "VOICE" && <Mic className="h-2.5 w-2.5 text-ember-300 shrink-0" />}
                <span className="ml-auto text-ember-200 tabular-nums shrink-0">
                  {fmtUsd(s.qty * s.unitPrice)}
                </span>
                <span className="text-muted-foreground truncate max-w-[80px] shrink-0">
                  {s.soldBy?.split(" ")[0] ?? ""}
                </span>
                <button
                  type="button"
                  onClick={() => void undo(s.id)}
                  className="text-muted-foreground hover:text-red-300 shrink-0"
                  aria-label="Undo this sale"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Close event */}
      <div className="pt-2">
        {closing ? (
          <Card className="border-amber-500/30">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm text-ivory">
                Close this event? {fmtUsd(snap.totalRevenue)} · {snap.totalUnits} units.
              </div>
              <div className="flex flex-wrap gap-2">
                {hasInventoryLinks && (
                  <Button variant="gold" size="sm" disabled={pending} onClick={() => finish(true)}>
                    Close + deduct inventory
                  </Button>
                )}
                <Button
                  variant={hasInventoryLinks ? "outline" : "gold"}
                  size="sm"
                  disabled={pending}
                  onClick={() => finish(false)}
                >
                  Close only
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setClosing(false)}>
                  Keep selling
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setClosing(true)}
          >
            <Flag className="h-3.5 w-3.5" /> Close event
          </Button>
        )}
      </div>

      {/* Ambrosi hold-to-talk */}
      <VoiceButton eventId={eventId} onRecorded={refresh} onUndo={undo} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Ambrosi — hold to talk, release to record the sale
// ─────────────────────────────────────────────────────────────────

function VoiceButton({
  eventId,
  onRecorded,
  onUndo,
}: {
  eventId: string;
  onRecorded: () => Promise<void>;
  onUndo: (saleId: string) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);

  async function start() {
    if (recording || processing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void send(mime);
      };
      recRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      if (navigator.vibrate) navigator.vibrate(30);
    } catch {
      toast.error("Microphone unavailable — check permissions in Settings.");
    }
  }

  function stop() {
    if (!recRef.current || recRef.current.state === "inactive") return;
    setRecording(false);
    recRef.current.stop();
  }

  async function send(mime: string) {
    const durationMs = Date.now() - startedAtRef.current;
    const blob = new Blob(chunksRef.current, { type: mime });
    if (durationMs < 400 || blob.size < 1000) {
      toast("Hold the mic while you speak.", { duration: 2500 });
      return;
    }
    setProcessing(true);
    try {
      const ext = mime.includes("webm") ? "webm" : "mp4";
      const fd = new FormData();
      fd.append("audio", new File([blob], `sale.${ext}`, { type: mime }));
      const r = await voiceEventSale(eventId, fd);
      if (!r.ok) {
        toast.error(r.error, {
          description: r.transcript ? `Heard: "${r.transcript}"` : undefined,
          duration: 6000,
        });
        return;
      }
      toast.success(
        `${r.qty > 1 ? `${r.qty} × ` : ""}${r.itemLabel} — ${fmtUsd(r.qty * r.unitPrice)}`,
        {
          description: `"${r.transcript}"`,
          action: { label: "Undo", onClick: () => void onUndo(r.saleId) },
          duration: 8000,
        },
      );
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
      await onRecorded();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-5 z-40" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <button
        type="button"
        aria-label="Hold to record a sale by voice"
        onPointerDown={(e) => {
          e.preventDefault();
          void start();
        }}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        disabled={processing}
        className={cn(
          "h-16 w-16 rounded-full border flex items-center justify-center shadow-cinematic transition select-none touch-none",
          recording
            ? "bg-red-500/90 border-red-400 scale-110"
            : processing
              ? "bg-ink-850 border-white/20"
              : "bg-gradient-to-br from-ember-400 to-tobacco-600 border-ember-300/50 active:scale-95",
        )}
      >
        {processing ? (
          <Loader2 className="h-6 w-6 text-ivory animate-spin" />
        ) : (
          <Mic className={cn("h-6 w-6", recording ? "text-white" : "text-ink-950")} />
        )}
      </button>
      <div className="text-center text-[9px] uppercase tracking-wider text-muted-foreground mt-1">
        {recording ? "listening…" : processing ? "Ambrosi…" : "hold to talk"}
      </div>
    </div>
  );
}
