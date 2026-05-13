import "server-only";
import { google } from "googleapis";
import { env } from "@/lib/env";

/**
 * Shared service-account auth used by both GA4 and GSC.
 *
 * Vercel UI escapes \n inside the private key as the literal characters '\n',
 * so we normalize them back to real newlines here.
 */
export function googleAuth(scopes: string[]) {
  if (!env.GOOGLE_CLIENT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
    throw new Error(
      "Google service account credentials not configured (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)",
    );
  }

  return new google.auth.JWT({
    email: env.GOOGLE_CLIENT_EMAIL,
    key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes,
  });
}

export function isGoogleConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_EMAIL && env.GOOGLE_PRIVATE_KEY);
}
