"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "./input";
import { Button } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "@/lib/utils";

/**
 * Reusable click-to-edit primitives. Each component:
 *  - Renders a static display in normal mode
 *  - Switches to an input on click (or pencil click)
 *  - Saves on Enter or blur via `onSave` server-action wrapper
 *  - Cancels on Escape
 *  - Shows a spinner during the save round-trip; success/failure via sonner
 *
 * Pass an async `onSave` that returns `{ ok: true } | { ok: false; error: string }`.
 */

export type SaveResult = { ok: true } | { ok: false; error: string };

type InlineProps<T> = {
  value: T;
  onSave: (v: T) => Promise<SaveResult>;
  label?: string;
  className?: string;
  displayClassName?: string;
  disabled?: boolean;
};

// ─────────────────────────────────────────────────────────────────
// InlineText
// ─────────────────────────────────────────────────────────────────

export function InlineText({
  value,
  onSave,
  placeholder,
  className,
  displayClassName,
  disabled,
  multiline = false,
}: InlineProps<string> & { placeholder?: string; multiline?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  useEffect(() => setDraft(value), [value]);

  function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await onSave(draft);
      if (!r.ok) {
        toast.error(r.error);
        setDraft(value);
      } else {
        toast.success("Saved.");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 text-left rounded px-1 -mx-1 hover:bg-white/[0.04] transition",
          disabled && "cursor-default opacity-60",
          displayClassName,
        )}
      >
        <span className={cn(!value && "text-muted-foreground italic")}>
          {value || placeholder || "—"}
        </span>
        {!disabled && (
          <Pencil className="h-3 w-3 shrink-0 opacity-40 group-hover:opacity-90 transition" />
        )}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {multiline ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          rows={3}
          className="flex w-full rounded-md border border-ember-500/40 bg-ink-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ember-500/40"
        />
      ) : (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className="h-7 text-sm border-ember-500/40"
        />
      )}
      {multiline && (
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            type="button"
            variant="gold"
            size="icon"
            onClick={save}
            disabled={pending}
            className="h-6 w-6"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      {pending && !multiline && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// InlineNumber
// ─────────────────────────────────────────────────────────────────

export function InlineNumber({
  value,
  onSave,
  min,
  max,
  step,
  suffix,
  displayClassName,
  disabled,
}: InlineProps<number> & {
  min?: number;
  max?: number;
  step?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    if ((min != null && draft < min) || (max != null && draft > max)) {
      toast.error("Value out of range");
      setDraft(value);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await onSave(draft);
      if (!r.ok) {
        toast.error(r.error);
        setDraft(value);
      } else {
        toast.success("Saved.");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-white/[0.04] tabular-nums transition",
          disabled && "cursor-default opacity-60",
          displayClassName,
        )}
      >
        <span>
          {value}
          {suffix ? <span className="text-muted-foreground"> {suffix}</span> : null}
        </span>
        {!disabled && (
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition" />
        )}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Input
        ref={inputRef}
        type="number"
        min={min}
        max={max}
        step={step ?? "1"}
        value={draft}
        onChange={(e) => setDraft(Number(e.target.value))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 w-20 text-xs border-ember-500/40 tabular-nums"
      />
      {pending && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// InlineSelect
// ─────────────────────────────────────────────────────────────────

export function InlineSelect<T extends string>({
  value,
  onSave,
  options,
  display,
  disabled,
}: InlineProps<T> & {
  options: { value: T; label: string }[];
  /** Custom display rendering — useful for badges */
  display?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState<T>(value);

  useEffect(() => setCurrent(value), [value]);

  function change(v: string) {
    const next = v as T;
    if (next === current) return;
    setCurrent(next); // optimistic
    startTransition(async () => {
      const r = await onSave(next);
      if (!r.ok) {
        setCurrent(value);
        toast.error(r.error);
      } else {
        toast.success("Saved.");
      }
    });
  }

  // If `display` is provided, render it inside a wrapper that's still clickable
  if (display) {
    return (
      <Select value={current} onValueChange={change} disabled={disabled || pending}>
        <SelectTrigger className="border-0 bg-transparent h-auto p-0 hover:opacity-80 transition shadow-none w-fit gap-1">
          <SelectValue asChild>
            <span>{display}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={current} onValueChange={change} disabled={disabled || pending}>
      <SelectTrigger className="h-7 text-xs w-fit border-ember-500/30 bg-ink-900/60">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─────────────────────────────────────────────────────────────────
// InlineDate
// ─────────────────────────────────────────────────────────────────

export function InlineDate({
  value,
  onSave,
  displayClassName,
  disabled,
  placeholder,
}: InlineProps<string | null> & { placeholder?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.slice(0, 10) ?? "");
  const [pending, startTransition] = useTransition();

  useEffect(() => setDraft(value?.slice(0, 10) ?? ""), [value]);

  function save() {
    const next = draft || null;
    if (next === (value?.slice(0, 10) ?? null)) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const r = await onSave(next ? new Date(next).toISOString() : null);
      if (!r.ok) {
        toast.error(r.error);
        setDraft(value?.slice(0, 10) ?? "");
      } else {
        toast.success("Saved.");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    const formatted = value
      ? new Date(value).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-white/[0.04] transition",
          disabled && "cursor-default opacity-60",
          displayClassName,
        )}
      >
        <span className={cn(!formatted && "text-muted-foreground italic")}>
          {formatted || placeholder || "Set date"}
        </span>
        {!disabled && (
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition" />
        )}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Input
        autoFocus
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(value?.slice(0, 10) ?? "");
            setEditing(false);
          }
        }}
        className="h-7 text-xs border-ember-500/40"
      />
      {pending && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
