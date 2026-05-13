import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint — returns ONLY presence flags and value-length hints.
 * Never returns actual env values. Safe to expose temporarily for setup
 * troubleshooting. Remove or gate before going truly public.
 */
export async function GET(_req: NextRequest) {
  const check = (val: string | undefined) => ({
    set: typeof val === "string" && val.length > 0,
    length: val ? val.length : 0,
    looksLikeUrl: val ? val.startsWith("http") : false,
    preview: val ? val.slice(0, 8) + "…" : null,
  });

  // Direct literal access — must mirror what Next.js inlines client-side
  return Response.json({
    runtime: "server",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    vars: {
      NEXT_PUBLIC_APP_URL: check(process.env.NEXT_PUBLIC_APP_URL),
      NEXT_PUBLIC_SUPABASE_URL: check(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: check(
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
      SUPABASE_SERVICE_ROLE_KEY: check(process.env.SUPABASE_SERVICE_ROLE_KEY),
      DATABASE_URL: check(process.env.DATABASE_URL),
      DIRECT_URL: check(process.env.DIRECT_URL),
      OPENAI_API_KEY: check(process.env.OPENAI_API_KEY),
      CRON_SECRET: check(process.env.CRON_SECRET),
    },
  });
}
