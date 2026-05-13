"use client";

import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  // Direct literal access — Next.js inlines these at build time.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env vars missing at build time. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel and redeploy WITHOUT build cache.",
    );
  }
  return createBrowserClient(url, anonKey);
}
