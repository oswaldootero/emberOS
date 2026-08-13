# EmberOS UI/UX Guidelines

The de facto rules the app already follows, written down so new modules stay
consistent. When in doubt, copy the Prospecting module (`/prospects`) — it is
the reference implementation for a CRM-style section.

## Theming — both themes must always work

The palette is CSS-variable driven (`src/app/globals.css`): `:root` is **Warm
Paper (light, the default)**, `.dark` is **Dark Luxury**. Semantics are fixed,
values flip.

- Use only the semantic utilities: `ink-*` (surfaces), `ivory` (body text),
  `ember-*` (brand gold), `tobacco`, `gold`, and the shadcn tokens
  (`muted-foreground`, `border`, …).
- `white` is remapped to a contrast variable, so `border-white/10`,
  `bg-white/[0.02]`, `divide-white/[0.04]` are theme-safe — use them for
  hairlines and hover tints.
- Never hardcode hex values or raw Tailwind palette colors for surfaces/text.
  Exception (existing debt, keep consistent): status tints `emerald-*`
  (success), `amber-*` (warning), `red-*` (danger) and the checkbox
  `accent-[#c69437]`.
- Test every new screen in both themes before shipping.

## Layout

- Every page: `<PageHeader eyebrow title description>{actions}</PageHeader>`
  from `src/components/shell/page-header.tsx`, actions as small buttons
  (`size="sm"`), the single primary action last with `variant="gold"`.
- Page root is `<div className="space-y-6">`. Forms/scan flows constrain width
  (`max-w-2xl` / `max-w-4xl`).
- KPI row: `grid grid-cols-2 lg:grid-cols-4 gap-4` of the local `Kpi` card.
- Detail pages: header panel, then `grid lg:grid-cols-[1.5fr_1fr] gap-6` —
  activity/work left, reference info right.
- **The page body must never scroll horizontally** (the `(app)` layout uses
  `overflow-x-clip`). Wide tables go inside
  `<div className="overflow-x-auto -mx-2"><table className="w-full text-sm min-w-[880px]">`.
- Navigation lives only in `src/components/shell/nav.config.ts`; sidebar and
  mobile drawer render it automatically.

## Mobile first — this app is used from a phone in the field

- No hover-only affordances. Row actions (delete, edit) must be visible at
  rest (muted color is fine) — `opacity-0 group-hover:opacity-100` hides them
  from touch users.
- Icon-only buttons: give a real hit area (~28px+; pad with `p-1.5 -m-1` if
  the icon is small) and an `aria-label`.
- Numeric fields get the right keyboard: `type="number"` for true numbers, or
  `inputMode="numeric"` on text inputs that accept formatted numbers.
- Hide secondary table columns on small screens (`hidden md:table-cell`,
  `hidden lg:table-cell`) instead of shrinking everything.
- Compress images client-side before uploading (canvas downscale to 1600px
  JPEG 0.85 — see the scan clients).

## Dates

- Date-only values (follow-ups, shipment dates) are stored as **UTC
  midnight**. Always format them with `timeZone: "UTC"`, or the day renders
  one earlier in US timezones.
- Default a date input to the **local** calendar day:
  `new Date().toLocaleDateString("en-CA")` — never `toISOString().slice(0,10)`
  (rolls to tomorrow in the evening).
- Real timestamps (`createdAt`, `lastContactDate`) format in local time.

## Lists & filtering

- URL `searchParams` are the single source of truth for filters, sort, and
  pagination — filter bars are plain GET `<form action="/route">` elements.
- Sort is `?sort=field:dir` with a server-side whitelist; column headers use
  the `SortableTh` pattern (copy from a list client); nullable columns sort
  `nulls: "last"` with an `updatedAt desc` tiebreaker.
- Pagination via `<Pagination>` + `buildQuery` from
  `src/components/ui/data-table.tsx`, 25 rows per page.
- Show active filters as a text line next to the card title with a "clear"
  link.
- Empty states: centered icon (muted, `opacity-40`), one sentence of guidance,
  and the same CTAs as the page header.

## Actions & feedback

- Mutations are server actions returning `{ ok: true, id } | { ok: false,
  error }`; on the client: `useTransition`, `toast.error(r.error)` /
  `toast.success(...)` (sonner), then `router.refresh()`.
- Destructive actions: native `confirm()` with a sentence that states the
  blast radius ("Their shipment and post history goes too."), red-tinted
  outline button, admin-only checks enforced inside the action.
- Pending states: swap the button icon for `<Loader2 className="animate-spin">`
  and disable — never leave a click unanswered.
- Multi-step flows (import, scan) are full pages, not modals.

## Buttons

One `gold` (primary) button per view. `outline` for secondary actions,
`ghost` for tertiary/cancel, red-tinted `outline` for destructive.

## Type scale

Data-dense by design: `text-sm` table bodies, `text-xs` metadata,
`text-[10px] uppercase tracking-wider` column headers/labels, `font-display`
for page titles and KPI numbers, `tabular-nums` on all numeric columns.
