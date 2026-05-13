"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false, // we send these manually on route change
    capture_pageleave: true,
    person_profiles: "identified_only",
    defaults: "2025-05-24",
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        ph.debug(false);
      }
    },
  });
}

export function PostHogProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { id: string; email: string; fullName?: string | null; role?: string } | null;
}) {
  // Identify the current user (or anonymize if signed out)
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.fullName ?? undefined,
        role: user.role,
      });
    } else {
      // Don't reset on every render — only if there's a recorded distinct_id
      const stored = posthog.get_distinct_id();
      if (stored && !stored.startsWith("$"))
        posthog.reset();
    }
  }, [user]);

  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    let url = window.location.origin + pathname;
    const search = searchParams.toString();
    if (search) url = `${url}?${search}`;
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

/**
 * Imperative capture helper — for tracking events outside React tree
 * (e.g. inside a setTimeout callback or sonner toast).
 */
export function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.capture(event, properties);
}
