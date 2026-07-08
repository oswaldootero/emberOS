"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Command, FileText, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { globalSearch, type SearchHit } from "@/server/actions/search";

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K focuses the search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function onChange(value: string) {
    setQ(value);
    setActive(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await globalSearch(value);
        setHits(results);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function go(hit: SearchHit) {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(hit.href);
  }

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || hits.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, hits.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const hit = hits[active];
            if (hit) go(hit);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search customers, invoices…"
        className="pl-9 pr-16 bg-ink-900/60"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-ink-700 px-1.5 font-mono text-[10px] text-muted-foreground">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Command className="h-3 w-3" />}
        {!loading && "K"}
      </kbd>

      {open && hits.length > 0 && (
        <div className="absolute top-11 left-0 right-0 z-40 rounded-md border border-white/10 bg-ink-850 shadow-cinematic py-1 max-h-80 overflow-y-auto">
          {hits.map((h, i) => (
            <button
              key={`${h.kind}-${h.id}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                i === active ? "bg-white/[0.05]" : ""
              }`}
            >
              {h.kind === "customer" ? (
                <Building2 className="h-3.5 w-3.5 text-ember-300 shrink-0" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="min-w-0">
                <span className="block text-ivory truncate">{h.title}</span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {h.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && hits.length === 0 && q.trim().length >= 2 && !loading && (
        <div className="absolute top-11 left-0 right-0 z-40 rounded-md border border-white/10 bg-ink-850 shadow-cinematic px-3 py-3 text-xs text-muted-foreground">
          No matches for “{q}”.
        </div>
      )}
    </div>
  );
}
