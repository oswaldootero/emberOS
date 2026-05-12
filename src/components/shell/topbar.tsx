"use client";

import { useState } from "react";
import { Bell, Command, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar({ user }: { user?: { email?: string | null } | null }) {
  const [q, setQ] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/[0.05] bg-ink-950/70 px-4 lg:px-6 backdrop-blur-xl">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search content, members, keywords…"
          className="pl-9 pr-16 bg-ink-900/60"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-ink-700 px-1.5 font-mono text-[10px] text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 text-ember-300" />
          <span className="hidden md:inline">Quick Generate</span>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-ember-400 to-tobacco-600 flex items-center justify-center text-[11px] font-medium text-ink-950">
          {user?.email?.[0]?.toUpperCase() ?? "H"}
        </div>
      </div>
    </header>
  );
}
