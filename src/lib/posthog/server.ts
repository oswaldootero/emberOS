import "server-only";
import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

function client(): PostHog | null {
  if (_client) return _client;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  if (!key) return null;
  _client = new PostHog(key, {
    host,
    flushAt: 1, // serverless: flush every event immediately
    flushInterval: 0,
  });
  return _client;
}

/**
 * Capture a server-side event for the given user.
 * Silently no-ops when PostHog isn't configured — never breaks the caller.
 */
export function captureServer(
  distinctId: string | null | undefined,
  event: string,
  properties?: Record<string, unknown>,
) {
  const c = client();
  if (!c) return;
  try {
    c.capture({
      distinctId: distinctId ?? "anonymous",
      event,
      properties,
    });
  } catch (e) {
    console.error("[posthog.capture] failed:", e);
  }
}

/**
 * Use at the end of serverless function handlers to ensure events
 * actually leave the box before the function shuts down.
 */
export async function flushPostHog() {
  const c = client();
  if (!c) return;
  try {
    await c.flush();
  } catch {
    // swallow
  }
}

export function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}
