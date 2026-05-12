import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — the middleware will refresh.
          }
        },
      },
    },
  );
}

export async function getSessionUser() {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
