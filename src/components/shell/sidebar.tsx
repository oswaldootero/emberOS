"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navigation } from "./nav.config";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-white/[0.05] bg-ink-900/60 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.05]">
        <div className="relative">
          <div className="absolute inset-0 blur-md bg-ember-500/40 rounded-full" />
          <Flame className="relative h-6 w-6 text-ember-300" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-base tracking-tight text-gold">
            EmberOS
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Heaven's Leaf
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigation.map((section) => {
          const visible = section.items.filter((i) => !i.adminOnly || isAdmin);
          if (visible.length === 0) return null;
          return (
          <div key={section.label} className="space-y-1.5">
            <div className="px-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              {section.label}
            </div>
            <ul className="space-y-0.5">
              {visible.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "text-ivory"
                          : "text-muted-foreground hover:text-ivory hover:bg-white/[0.03]",
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="active-pill"
                          className="absolute inset-0 rounded-md bg-gradient-to-r from-ember-500/15 to-transparent border border-ember-500/20"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "relative h-4 w-4 transition-colors",
                          active ? "text-ember-300" : "group-hover:text-ember-300/70",
                        )}
                      />
                      <span className="relative font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="relative ml-auto rounded-full bg-ember-500/15 px-1.5 py-0.5 text-[10px] text-ember-200">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.05]">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
          v0.1 · Cinematic Build
        </div>
      </div>
    </aside>
  );
}
