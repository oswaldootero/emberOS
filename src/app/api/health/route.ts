import { env } from "@/lib/env";
import { instagramConfigured } from "@/server/integrations/meta";
import { pushConfigured } from "@/server/notifications/push";
import { emailConfigured } from "@/server/notifications/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public, secret-free status: which build is live and which optional
 * integrations are configured. Used to verify deploys from outside.
 */
export async function GET() {
  return Response.json(
    {
      ok: true,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
      configured: {
        openai: Boolean(env.OPENAI_API_KEY),
        push: pushConfigured(),
        email: emailConfigured(),
        instagram: instagramConfigured(),
        cronSecret: Boolean(env.CRON_SECRET),
      },
      time: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
