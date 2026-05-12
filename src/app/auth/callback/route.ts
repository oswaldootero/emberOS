import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Mirror the Supabase user into our application User table
      try {
        await prisma.user.upsert({
          where: { supabaseId: data.user.id },
          update: {
            email: data.user.email!,
            lastSeenAt: new Date(),
          },
          create: {
            supabaseId: data.user.id,
            email: data.user.email!,
            fullName: data.user.user_metadata?.full_name,
            avatarUrl: data.user.user_metadata?.avatar_url,
            lastSeenAt: new Date(),
          },
        });
      } catch {
        // Database may not be migrated yet — continue regardless
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
