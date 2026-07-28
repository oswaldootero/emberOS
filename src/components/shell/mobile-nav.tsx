"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, X } from "lucide-react";
import { navigation } from "./nav.config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Hamburger + slide-in drawer for screens below lg (where the sidebar is hidden). */
export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close when the route changes (link tapped)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden -ml-1 shrink-0"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Portal to <body>: the topbar's backdrop-filter would otherwise
          become the containing block for this fixed overlay and trap it
          inside the 56px header. */}
      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-[290px] max-w-[85vw] flex flex-col bg-ink-900 border-r border-white/[0.08] shadow-cinematic pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 blur-md bg-ember-500/40 rounded-full" />
                  <Flame className="relative h-5 w-5 text-ember-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-base tracking-tight text-gold">
                    EmberOS
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Heaven's Leaf
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 overscroll-contain">
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
                        const Icon = item.icon;

                        if (item.children?.length) {
                          return (
                            <li key={item.href}>
                              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground">
                                <Icon className="h-4 w-4" />
                                <span className="font-medium">{item.label}</span>
                              </div>
                              <ul className="ml-[1.35rem] border-l border-white/[0.06] pl-2 space-y-0.5">
                                {item.children.map((child) => {
                                  const ChildIcon = child.icon;
                                  const childActive =
                                    pathname === child.href ||
                                    pathname.startsWith(`${child.href}/`);
                                  return (
                                    <li key={child.href}>
                                      <Link
                                        href={child.href}
                                        className={cn(
                                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px]",
                                          childActive
                                            ? "text-ivory bg-gradient-to-r from-ember-500/15 to-transparent border border-ember-500/20"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        <ChildIcon
                                          className={cn(
                                            "h-3.5 w-3.5",
                                            childActive && "text-ember-300",
                                          )}
                                        />
                                        <span className="font-medium">{child.label}</span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </li>
                          );
                        }

                        const active =
                          pathname === item.href ||
                          (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                                active
                                  ? "text-ivory bg-gradient-to-r from-ember-500/15 to-transparent border border-ember-500/20"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Icon
                                className={cn("h-4 w-4", active && "text-ember-300")}
                              />
                              <span className="font-medium">{item.label}</span>
                              {item.badge && (
                                <span className="ml-auto rounded-full bg-ember-500/15 px-1.5 py-0.5 text-[10px] text-ember-200">
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
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
