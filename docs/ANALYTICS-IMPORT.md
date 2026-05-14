# Analytics Import Guide

How to feed EmberOS with real audience data from Google Analytics, Search Console, Meta Business Suite, and YouTube. The dashboard parses your CSVs, surfaces top performers, and lets the AI tell you in plain English what's working and what's not.

---

## TL;DR

| Platform | Where to export | Upload as |
|---|---|---|
| **Google Analytics 4** | `analytics.google.com` → any report → Share → Download CSV | Traffic acquisition / Pages and screens / Demographics |
| **Search Console** | `search.google.com/search-console` → Performance → Export → CSV (ZIP) | Performance — Queries / Performance — Pages |
| **Instagram (Meta)** | `business.facebook.com/latest/insights` → Content → Export → CSV | Content insights / Account overview |
| **Facebook (Meta)** | Same as Instagram, switch page | Content insights / Page overview |
| **YouTube Studio** | `studio.youtube.com` → Analytics → Content → Export → CSV | Content (videos) |

Once you have a CSV, open `/analytics/import` in EmberOS → pick the source + report type → drag-drop the file → Import.

---

## Google Analytics 4

### Step-by-step

1. Open <https://analytics.google.com>
2. Top-left dropdown — pick your **Heaven's Leaf** property
3. Pick a report from the **Reports** section in the left sidebar:

   | Report path | Upload as |
   |---|---|
   | Life cycle → Acquisition → **Traffic acquisition** | `Traffic acquisition` |
   | Life cycle → Engagement → **Pages and screens** | `Pages and screens` |
   | User → User attributes → **Demographic details** | `Demographics` |

4. Top-right: set the **date range** (Last 7 days, Last 28 days, etc.). The export uses whatever range is currently displayed.
5. Top-right corner: click the **Share icon** (`↗`). If you don't see it, look for the three vertical dots menu.
6. **Download file → Download CSV**

A file like `Traffic acquisition - Session source - medium.csv` downloads.

### Notes

- GA4 prepends comment lines starting with `#` and a `Start date: / End date:` block. EmberOS auto-skips these.
- Don't open the CSV in Excel before uploading — Excel sometimes adds a BOM byte that breaks parsers. If you need to preview it, use a plain text editor or a Google Sheet.

---

## Google Search Console

### Step-by-step

1. Open <https://search.google.com/search-console>
2. Top-left dropdown — pick your **heavensleaf.com** property
   - If you don't see one, you need to verify ownership first via DNS or HTML tag
3. Left sidebar: **Performance → Search results**
4. (Optional) Adjust date range — default "Last 3 months" is fine for keyword data
5. Top-right corner: **Export ↑** → **Download CSV**

You'll get a **ZIP file** containing 6 CSVs. Unzip it and use these two:

| File | Upload as |
|---|---|
| `Queries.csv` | `Performance — Queries` |
| `Pages.csv` | `Performance — Pages` |

The other files (`Countries.csv`, `Devices.csv`, `Search appearance.csv`, `Dates.csv`) aren't parsed yet — ignore them.

### Notes

- GSC data lags ~24–48 hours. "Today's" export won't include today's data.
- The 3-month default gives more reliable rankings than a 7-day window.

---

## Instagram + Facebook (Meta Business Suite)

Both Instagram and Facebook live in the same tool — Meta Business Suite. The export flow is the same, you just switch which account is selected at the top.

### Prerequisites (one-time check)

You need:

1. A **Facebook Page** for Heaven's Leaf
2. An **Instagram Business Account** (not a personal account) connected to that Page
3. Admin / Editor access to both

If you're not sure, open <https://business.facebook.com> — if you can see your accounts there, you're set. If not, you need to:

- **Convert IG to Business** — Instagram app → Settings → Account → Switch to Professional Account
- **Connect IG to your FB Page** — Page Settings → Linked Accounts → Instagram → Connect

### Instagram content export

Gives you **per-post data**: reach, impressions, reactions, comments, shares, saves, permalink.

1. Open <https://business.facebook.com/latest/insights>
   - Sign in with the Facebook account that admins your Heaven's Leaf Page
2. **Top-left dropdown** — make sure your **Instagram account** is selected
3. **Left sidebar → Content**
4. **Top filter row:**
   - Set date range (top-right corner — e.g., "Last 7 days" or "Last 28 days")
   - Optionally filter **Format** to Posts / Reels / Stories if you only want one type
5. **Top-right corner → ⋯ menu → Export**
   - If you don't see "Export," look for a **down-arrow icon** or **Download** label
6. **Choose CSV format**

File downloads as something like `instagram-content-YYYY-MM-DD.csv`.

**Upload in EmberOS:**

- Source: **Instagram (Meta Business Suite)**
- Report type: **Content insights (posts / reels)**

### Facebook content export

Same tool, switch to the Facebook Page.

1. <https://business.facebook.com/latest/insights>
2. **Top-left dropdown** — switch to your **Facebook Page**
3. **Left sidebar → Content**
4. Set date range top-right
5. **⋯ menu → Export → CSV**

**Upload in EmberOS:**

- Source: **Facebook (Meta Business Suite)**
- Report type: **Content insights (posts)**

### Account / Page Overview (daily reach trend — optional)

Unlocks the **Daily Reach Overlay** chart on the unified dashboard.

1. Same Business Suite URL
2. Switch to **Instagram** or **Facebook** account
3. **Left sidebar → Insights** (not Content)
4. Set date range
5. The **Overview** tab is the default view
6. **⋯ menu → Export → CSV**

**Upload in EmberOS:**

- Source: **Instagram** → report type **Account overview**
- Source: **Facebook** → report type **Page overview**

### What the CSV looks like

Each row is one post. Columns typically include:

| Column (typical name) | What it means |
|---|---|
| Post ID | Unique identifier |
| Post type / Media type | Post / Reel / Story / Video |
| Title / Description / Caption | The text body of the post |
| Publish time / Date | When it was published |
| Reach / Accounts reached | Unique people who saw it |
| Impressions | Total views (can exceed reach) |
| Reactions / Likes | Total reactions |
| Comments | Comment count |
| Shares | Share/send count |
| Saves | Save count (IG-specific) |
| Permalink | Direct link to the post |

EmberOS handles variation in column names — `Likes` vs `Reactions`, `Caption` vs `Description`, etc.

### If Meta Business Suite is acting up

Meta's UI changes constantly. If the Export button isn't where described:

- Try the direct URL: <https://business.facebook.com/latest/posts>
- If you're stuck on the old **Creator Studio** interface, the path is **Creator Studio → Insights → posts → Export**
- The Instagram **mobile app** has Insights but no CSV export — use desktop Business Suite
- The Facebook **Page Insights** (the older "Insights" tab on your Page directly) does have CSV export under "Export Data" — works as a fallback

### Common Meta-specific gotchas

| Problem | Fix |
|---|---|
| "My Instagram account isn't showing in Business Suite" | Your IG must be a Business or Creator account AND connected to your FB Page. Convert via the IG app: Settings → Account → Switch to Professional Account, then connect to your FB Page. |
| "Export button is grayed out" | You may not have admin access. Page admins / editors only. |
| "CSV opens with weird emoji characters" | Open in a plain text editor (not Excel) — Meta exports as UTF-8, Excel sometimes mangles. Upload directly to EmberOS without opening. |
| "Parser says 'Couldn't find header row'" | Wrong report type. Make sure you exported from the **Content** tab, not Audience or Reach. |
| "All my numbers are zero" | Date range probably excluded any posts. Set range to at least "Last 28 days." |
| "I don't see Meta Business Suite at all" | <https://business.facebook.com> not loading? You may need to first claim/create a Business Account — Meta has been rolling out forced migrations. Visit <https://business.facebook.com/overview> and follow the setup prompts. |

---

## YouTube Studio

### Step-by-step

1. Open <https://studio.youtube.com>
2. Left sidebar: **Analytics**
3. Top tabs: **Content**
4. Set date range (top-right)
5. **Export ↗ button (top-right) → Comma-separated values (.csv)**

Upload as `Content (videos)`.

### What you get

A CSV with one row per video: Video title, Publish time, Views, Impressions, Watch time, Average view duration, Subscribers gained.

---

## How to upload in EmberOS

1. Open <https://ember-os-one.vercel.app/analytics/import> (or click **Import CSV** in the top-right of `/analytics`)
2. Pick **Source platform** from the dropdown
3. Pick **Report type** from the next dropdown (matches the report you exported)
4. Optionally add a **Label** like "May 7–13" to find it easily later
5. **Drag** the CSV file into the dropzone — or click to browse
6. Click **Import**

You'll get a toast notification with the row count. The data appears on `/analytics` as a card under that source.

---

## Recommended cadence

**Sunday morning** is the natural rhythm for a content brand. Drop in:

- 1 Instagram **Content insights** CSV (last 7 days)
- 1 Facebook **Content insights** CSV (last 7 days)
- 1 GSC **Queries** CSV (last 28 days, since GSC lags)
- 1 GA4 **Traffic acquisition** CSV (last 7 days)

Then click **"Generate insights"** at the top of `/analytics`. In ~10 seconds, you get a plain-English review:

- ✓ **What's working** — specific wins with numbers
- ✗ **What's not working** — honest gaps
- ⤴ **What to try next** — 3–5 concrete experiments
- **Numbers worth remembering** — the top 4–6 metrics across all platforms

Read for 2 minutes. Decide what to do that week.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| **GA4 export is empty** | You have no tracked data yet. Confirm the GA4 tracking snippet is live on heavensleaf.com and at least 24 hours of visits have passed. |
| **Parser says "Couldn't find header row"** | The CSV might have an Excel BOM byte. Re-export from the source directly, don't open in Excel first. Or save as plain UTF-8 CSV. |
| **Numbers look wrong (way too large/small)** | GA4 sometimes uses comma thousands-separators (`1,234`). Our parser handles this, but if numbers still look off, paste an example row and we'll fix the regex. |
| **GSC shows "No data"** | Property might not be verified, or it might be a URL-prefix property that excludes www-vs-non-www. Re-verify if needed. |
| **Meta export says "Couldn't find header row in Meta export"** | The CSV may be the wrong report. Confirm you exported from the **Content** tab (not Audience or Reach). |
| **YouTube export columns look different** | YouTube changes column names occasionally. Paste a sample header row and we'll update the parser. |
| **Insights button does nothing** | Open the browser console — if you see a 429, you've hit the rate limit (6 generations per 5 min). Wait and retry. |
| **AI insights are too generic** | Upload more reports. The model gets better with more data points. Aim for 3+ sources per week. |

---

## What's stored, what isn't

When you upload a CSV, EmberOS extracts and stores:

- **Totals**: aggregate metrics like total clicks, impressions, users
- **Time series**: daily breakdowns when the report includes a date dimension
- **Top entities**: the top 20–50 entries (posts, queries, pages, videos) with their key metrics
- **Metadata**: filename, period dates, row count, any parser warnings

EmberOS does **NOT** store the full raw CSV after parsing. If you need the raw data later, keep your local copy.

Each upload creates a new `AnalyticsImport` record. The dashboard only shows the latest of each (source, report type) pair, but old records remain in the database for future trend / diff features.

---

## Cost

| Action | Approximate cost |
|---|---|
| CSV import (parsing) | Free — runs on your Vercel function quota |
| AI insights generation | ~$0.02 per generation (GPT-4o, ~3K tokens in, ~1K out) |
| Storage | Negligible — each import is a few KB |

A team running weekly imports + insights spends < $1/month on insights.

---

## Privacy

- Imported CSVs never leave your Vercel + Supabase infrastructure
- AI insights send only normalized totals + top-N entities to OpenAI (no raw user-level data)
- All actions are audit-logged in the database

---

## Adding a new source or report type

If you want EmberOS to parse a new export format (e.g., TikTok Studio, Twitter Analytics):

1. Add a new parser function to `src/server/analytics/parsers.ts`
2. Register it in the `PARSERS` map
3. Add its key/label to the `REPORT_TYPES` object so it appears in the upload UI dropdown

The parser receives the raw CSV string and returns a normalized `ParsedImport` shape. See existing parsers (especially `parseMetaContent`) for the pattern.
