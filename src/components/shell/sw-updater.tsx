"use client";

import { useEffect } from "react";

/**
 * Keeps an installed PWA current. Browsers only check for a new service
 * worker on navigation, and a home-screen app can sit for days on one
 * rendered page. So: re-check whenever the app is foregrounded, and once
 * a new worker takes control, reload one time to pick up the new build.
 */
export function SwUpdater() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    const check = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update();
      } catch {
        /* offline or unsupported — ignore */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onControllerChange = () => {
      if (cancelled) return;
      // Guard against reload loops if a worker flaps.
      const key = "emberos:sw-reloaded-at";
      const last = Number(sessionStorage.getItem(key) ?? 0);
      if (Date.now() - last < 15_000) return;
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    };

    void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);
  return null;
}
