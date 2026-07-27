"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GlobalSearch } from "@/components/shell/global-search";
import { MobileNav } from "@/components/shell/mobile-nav";
import { supabaseBrowser } from "@/lib/supabase/client";

type UserShape = { email?: string | null; fullName?: string | null } | null;

export function Topbar({
  user,
  isAdmin = false,
}: {
  user?: UserShape;
  isAdmin?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    try {
      const sb = supabaseBrowser();
      await sb.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Sign-out failed.");
    }
  }

  const initial =
    user?.fullName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "H";
  const display = user?.fullName ?? user?.email ?? "Brother";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 md:gap-4 border-b border-white/[0.05] bg-ink-950/70 px-4 lg:px-6 backdrop-blur-xl">
      <MobileNav isAdmin={isAdmin} />
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <a href="/studio">
            <Sparkles className="h-4 w-4 text-ember-300" />
            <span className="hidden md:inline">Quick Generate</span>
          </a>
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="h-8 w-8 rounded-full bg-gradient-to-br from-ember-400 to-tobacco-600 flex items-center justify-center text-[11px] font-medium text-ink-950 hover:ring-2 hover:ring-ember-500/40 transition"
            aria-label="Account menu"
          >
            {initial}
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-20 w-56 rounded-md border border-white/10 bg-ink-850 shadow-cinematic py-1">
                <div className="px-3 py-2 border-b border-white/[0.05]">
                  <div className="text-sm text-ivory truncate">{display}</div>
                  {user?.email && user.fullName && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      {user.email}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ivory hover:bg-white/[0.04]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
