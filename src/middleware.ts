import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that are externally callable and verify their own signatures
const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/api/cron",
  "/api/webhooks",
  "/api/scheduling",
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });
  const pathname = req.nextUrl.pathname;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return res;
  }

  // Skip when Supabase is not configured (initial setup)
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // API routes get JSON 401; pages get a redirect to /login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    // Protect everything except static files and Next internals
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
