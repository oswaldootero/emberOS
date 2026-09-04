# EmberOS — Heaven's Leaf Mission Control

A cinematic AI-powered media operating system for **Heaven's Leaf** — a premium lifestyle cigar brand built on brotherhood, ritual, motorcycles, reflection, faith, and slow living.

> Not a social scheduler. A media OS for a movement.

---

## ✦ What's inside

| Area | What it does |
| --- | --- |
| **Mission Control** | Cinematic dashboard — scheduled queue, engagement chart, channel health, brotherhood pulse. |
| **AI Content Studio** | Streaming OpenAI generation with brand-voice memory, four tone sliders, ten content types, real-time shadowban scoring. |
| **Repurpose Engine** | One source → IG, FB, Telegram, X, YouTube, SEO article, email, hashtags, pull quotes, reel hooks. |
| **Telegram Command** | Brotherhood Bot with daily reflections, cigar check-ins, scripture prompts, FAQ, welcome flow. |
| **Publishing** | Instagram / Facebook / YouTube / X with Meta-tobacco-policy guardrails baked in. |
| **WordPress** | REST-API publishing, featured-image upload, Yoast SEO meta. |
| **WooCommerce** | Product + order sync for the merch side. |
| **SEO Command** | Cluster tracking, content-gap ideas, ranking deltas. |
| **Analytics** | Platform comparison, theme resonance, engagement trends. |
| **Calendar** | Month grid with drag/drop-ready scheduling and campaign grouping. |
| **Brand Voice** | Persistent tone, vocabulary, forbidden words, theological guardrails — loaded into every AI call. |
| **Workflows** | Visual automation pipelines (`blog published → cascade everywhere`). |
| **Asset Library** | Supabase Storage-backed media library. |
| **Social Scouting** | Instagram mentions inbox — capture from a link or screenshot with zero setup, or connect Meta for automatic sync and handle lookup. One click to influencer or prospect. See `docs/SOCIAL-SCOUTING.md`. |

---

## ✦ Tech stack

- **Framework**: Next.js 15 (App Router, RSC, Server Actions) + TypeScript
- **UI**: TailwindCSS + shadcn/ui primitives + Framer Motion + Recharts
- **Database**: Supabase Postgres + Prisma ORM (17 models, pgvector-ready)
- **Auth**: Supabase Auth (magic link)
- **Storage**: Supabase Storage
- **AI**: OpenAI (GPT-4o primary, GPT-4o-mini fast, text-embedding-3-large)
- **Scheduling**: Vercel Cron (daily reflection) + WordPress native scheduler
- **Rate limit**: Upstash Redis + `@upstash/ratelimit`
- **Analytics**: PostHog
- **Hosting**: Vercel

---

## ✦ Project structure

```
src/
├── app/
│   ├── (app)/              # Authenticated mission-control surface
│   │   ├── dashboard/
│   │   ├── studio/         # AI Content Studio (streaming)
│   │   ├── repurpose/      # Multi-channel repurpose engine
│   │   ├── calendar/
│   │   ├── publishing/
│   │   ├── telegram/
│   │   ├── wordpress/
│   │   ├── seo/
│   │   ├── analytics/
│   │   ├── brand-voice/
│   │   ├── library/
│   │   ├── workflows/
│   │   └── settings/
│   ├── api/
│   │   ├── ai/             # generate (stream), repurpose, safety, insights, daily-intentions, image
│   │   ├── webhooks/       # telegram
│   │   └── cron/           # vercel-cron entrypoints
│   ├── auth/callback/
│   └── login/
├── components/
│   ├── ui/                 # shadcn primitives (button, card, tabs, slider…)
│   ├── shell/              # sidebar, topbar, page header
│   ├── dashboard/
│   ├── studio/
│   ├── repurpose/
│   ├── analytics/
│   └── auth/
├── lib/
│   ├── env.ts              # zod-validated env
│   ├── prisma.ts
│   ├── openai.ts
│   ├── rate-limit.ts
│   ├── supabase/{server,client}.ts
│   └── utils.ts
├── server/
│   ├── ai/                 # brand-voice, prompt-templates, repurpose, safety
│   ├── integrations/       # wordpress, telegram, meta, youtube, woocommerce
│   ├── analytics/          # parsers, dashboard aggregator, imports loader
│   ├── analytics.ts
│   ├── calendar.ts
│   ├── dashboard.ts
│   └── audit.ts
├── middleware.ts           # auth gate
└── app/globals.css         # cinematic dark theme

prisma/
├── schema.prisma           # 17 models
└── seed.ts                 # brand voice + templates + sample workflow
```

---

## ✦ Getting started locally

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy the example and fill in values:

```bash
cp .env.example .env.local
```

The app boots with **just** these to get started:
- `DATABASE_URL` + `DIRECT_URL` (Supabase Postgres)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

Every other integration (Telegram, WordPress, Meta, YouTube, Woo, QStash, PostHog, GSC) is **optional** and lights up on `/settings` as you add keys.

### 3. Provision the database

```bash
npx prisma migrate dev --name init
npm run db:seed
```

> **pgvector**: the schema declares `Unsupported("vector(3072)")` fields for semantic search on `BrandVoice` and `ContentPiece`. Enable the extension in Supabase first:
>
> ```sql
> create extension if not exists vector;
> ```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`. Sign in via magic link, and you'll land on Mission Control.

---

## ✦ Deploying to Vercel

### One-shot setup

1. **Create a Supabase project** → grab `DATABASE_URL` (pooler, port 6543) and `DIRECT_URL` (session, port 5432).
2. **Import the repo into Vercel.**
3. Add **all** required env vars from `.env.example` to Vercel → Project → Settings → Environment Variables.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (or custom domain).
5. Deploy. `npm run build` runs `prisma generate`, then `prisma migrate deploy`, then `next build`, so pending migrations are applied on every deploy.

### Migrations

Schema changes go through Prisma Migrate — never `prisma db push` against production.

- `npm run db:migrate` — after editing `schema.prisma`, creates a migration in `prisma/migrations/` and applies it locally.
- `npm run db:deploy` — applies pending migrations (this is what the Vercel build runs).
- `npm run db:status` — shows which migrations the database has applied.

All `db:*` scripts load `.env.local` for you (Prisma's CLI only reads `.env` on its own), so run them from the project folder in a terminal.

**One-time baseline for a database that predates the migrations folder:** the first migration (`20260904000000_baseline`) reproduces the schema as it existed before migrations were introduced. Mark it as already applied, then deploy the rest:

```bash
npm run db:baseline
npm run db:deploy
```

### Telegram webhook

After deploy, register the webhook once:

```bash
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://YOUR-DOMAIN/api/webhooks/telegram\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\"
  }"
```

### Vercel Cron

`vercel.json` already declares a daily reflection cron at `14:00 UTC`. Authenticate the endpoint by setting `CRON_SECRET`.

---

## ✦ The brand voice memory

`src/server/ai/brand-voice.ts` is the source-of-truth for the Heaven's Leaf voice:

- Identity statement
- Tone descriptors
- Hard rules (`never use 'buy now'`, `never invoke scripture as a sales hook`)
- Preferred language palette (`draw, ember, the porch, smoke that prays`)
- Forbidden words
- Cadence guidance
- Recurring themes

It is loaded into **every** OpenAI request via `brandVoiceSystemPrompt()`. To evolve the voice:

1. Edit the constants in `brand-voice.ts` for code-tracked changes, **or**
2. Use the `BrandVoice` Prisma model to store team-editable variations.

---

## ✦ Safety / shadowban scoring

`src/server/ai/safety.ts` is a fast heuristic scanner that flags:

- Direct sales CTAs (`buy now`, `shop now`)
- Pricing mentions
- Engagement bait (`tag a friend`)
- Hashtag-count violations (Instagram caps at 30)
- ALL-CAPS abuse
- Excessive emoji
- Restricted-category keywords (Meta tobacco classifier triggers)

The Studio runs this against every generation in real time and shows a **Safe / Watch / Risky** badge.

---

## ✦ AI architecture

```
        ┌─────────────────┐
        │ brand-voice.ts  │ ← always system prompt #1
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ prompt-templates│ ← caption | blog | devotional | seo | …
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ tone directive  │ ← from 4 sliders
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ user payload    │
        └────────┬────────┘
                 │
              OpenAI
                 │
        ┌────────▼────────┐
        │ stream to client│
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ safety scoring  │ (after stream completes)
        └─────────────────┘
```

Every generation is persisted as an `AIJob` row with prompt/completion/total tokens, `costUsd`, model, and duration — ready for finance dashboards.

---

## ✦ Roles & permissions

The Prisma `User.role` enum supports four roles:

- `ADMIN` — full control, settings, integrations
- `CONTENT_CREATOR` — draft, generate, schedule
- `COMMUNITY_MANAGER` — Telegram ops, approval queue
- `AMBASSADOR` — read-only insights, contribution leaderboard

(Role-based middleware enforcement is the natural next addition to `middleware.ts`.)

---

## ✦ Bonus features included

- ✅ AI shadowban-safety scoring
- ✅ Repurpose-everything engine (8 surfaces)
- ✅ Ambassador leaderboard scaffold (`TelegramMember.contributionScore`)
- ✅ Voice-note-to-content pipeline (via `sourceType: "voice_note"` in repurpose)
- ✅ Semantic-search-ready (`Unsupported("vector(3072)")` on `BrandVoice` + `ContentPiece`)
- ✅ DSA event tracking (`CommunityEvent.isDSA`)
- ✅ Audit logging on every meaningful action
- ✅ AI cost + token tracking on every job

---

## ✦ Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build (`prisma generate` → `prisma migrate deploy` → `next build`) |
| `npm run lint` | ESLint (flat config, Next + TypeScript rules) |
| `npm run typecheck` | TypeScript no-emit check |
| `npm run test` | Vitest unit tests (`src/**/*.test.ts`) |
| `npm run db:status` | Show applied / pending migrations |
| `npm run db:baseline` | One-time: mark the baseline migration as already applied |
| `npm run db:deploy` | Apply pending migrations (Vercel build runs the same thing) |
| `npm run db:migrate` | Create + apply a migration locally |
| `npm run db:seed` | Seed brand voice, templates, sample workflow |
| `npm run db:studio` | Open Prisma Studio |

---

## ✦ Documentation

- [Analytics CSV Import Guide](docs/ANALYTICS-IMPORT.md) — how to export from GA4, Search Console, Meta Business Suite, and YouTube, then feed it to EmberOS for AI-driven insights
- [UI/UX Guidelines](docs/UI-GUIDELINES.md) — theming, layout, mobile, date handling, and interaction conventions every new module must follow
- [Social Scouting](docs/SOCIAL-SCOUTING.md) — Meta app setup walkthrough for the Instagram mentions inbox, handle lookup, and webhook

---

## ✦ License

Proprietary — Heaven's Leaf, 2026.

> *"Brothers don't gather for the cigar — they gather for the silence between the draws."*
