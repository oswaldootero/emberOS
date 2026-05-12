import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/server/audit";

export const dynamic = "force-dynamic";

/**
 * OAuth / magic-link callback.
 *
 * Access policy (invite-only):
 * 1. If the User table is empty, the first sign-in is bootstrapped as ADMIN.
 * 2. Otherwise, the email must already exist in the User table (admin-invited)
 *    — we link supabaseId on first successful sign-in.
 * 3. If the email isn't invited, we sign them out and redirect to
 *    /login?error=not_invited.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const sb = await supabaseServer();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const email = data.user.email.toLowerCase();
  const sbUserId = data.user.id;

  try {
    const userCount = await prisma.user.count();

    if (userCount === 0) {
      // Bootstrap: first user becomes ADMIN
      await prisma.user.create({
        data: {
          supabaseId: sbUserId,
          email,
          role: "ADMIN",
          fullName: data.user.user_metadata?.full_name,
          avatarUrl: data.user.user_metadata?.avatar_url,
          lastSeenAt: new Date(),
        },
      });
      await audit("auth.bootstrap_admin", {
        entityType: "User",
        diff: { email },
      });
    } else {
      // Invite-only: must already exist
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await sb.auth.signOut();
        return NextResponse.redirect(
          `${origin}/login?error=not_invited`,
        );
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          supabaseId: sbUserId,
          lastSeenAt: new Date(),
          fullName: existing.fullName ?? data.user.user_metadata?.full_name,
          avatarUrl: existing.avatarUrl ?? data.user.user_metadata?.avatar_url,
        },
      });
      await audit("auth.signin", {
        actorId: existing.id,
        entityType: "User",
        entityId: existing.id,
      });
    }
  } catch (e) {
    console.error("[auth.callback] DB error:", e);
    // Don't block sign-in on DB issues — let them in, but they may hit auth gate
  }

  return NextResponse.redirect(`${origin}${next}`);
}
