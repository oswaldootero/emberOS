"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/server/actions/tasks";

type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Enable/disable PWA push on this device. Renders nothing when VAPID isn't configured. */
export function PushToggle({ publicKey, compact = false }: { publicKey: string | null; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!publicKey) return setState("unsupported");
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iOS Safari only exposes push to installed (home-screen) apps.
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        return setState(ios ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [publicKey]);

  function enable() {
    start(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setState(perm === "denied" ? "denied" : "off");
          return;
        }
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready);
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!) });
        const json = sub.toJSON();
        const r = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        setState("on");
        const t = await sendTestPush();
        toast.success(t.ok ? "Notifications on — a test ping is on its way." : "Notifications on.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't enable notifications.");
      }
    });
  }

  function disable() {
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Notifications off on this device.");
    });
  }

  if (!publicKey || state === "loading") return null;

  const hint =
    state === "needs-install"
      ? "On iPhone, add EmberOS to your Home Screen first (Share → Add to Home Screen), then enable here."
      : state === "unsupported"
        ? "This browser doesn't support push notifications."
        : state === "denied"
          ? "Notifications are blocked for this site in your browser settings."
          : state === "on"
            ? "You'll get a ping when a task is assigned to you and each morning for what's due."
            : "Get a ping when a task is assigned to you, and a morning reminder for what's due.";

  const button =
    state === "on" ? (
      <Button variant="outline" size="sm" onClick={disable} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />} Turn off on this device
      </Button>
    ) : state === "off" ? (
      <Button variant="gold" size="sm" onClick={enable} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Enable notifications
      </Button>
    ) : null;

  if (compact) {
    if (state !== "off") return null;
    return (
      <div className="rounded-lg border border-ember-500/25 bg-ember-500/[0.06] p-3 flex items-center gap-3 flex-wrap text-xs text-ivory">
        <Bell className="h-4 w-4 text-ember-300 shrink-0" />
        <span className="flex-1 min-w-[12rem]">{hint}</span>
        {button}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{hint}</p>
      {button}
    </div>
  );
}
