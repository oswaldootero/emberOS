# Social Scouting — Instagram mentions inbox & handle lookup

EmberOS reads from Instagram through Meta's official Graph API. Nothing is
scraped: Meta only exposes public data for **Business and Creator**
accounts, and only to an app connected to your own Business account. That
covers most real influencers and nearly every lounge or shop.

## Zero-setup path (start here)

Nothing to configure. When you see that someone tagged or mentioned
Heaven's Leaf, open **Social Scouting → Capture** (`/social/capture`) and
either paste the post/profile link (Instagram → ⋯ → Copy link) or drop a
screenshot of the post, story, or notification. AI reads the handle,
caption, and like count from the screenshot; the link supplies the
permalink. The mention lands in the inbox with the same one-click actions
as automatic ones (add influencer, add prospect, log as post), and it
auto-links to anyone you already track under that handle.

Everything below this line is **optional** — it only adds automatic
collection through Meta's API.

---

What you get once Meta is connected:

| Feature | Where | How it works |
|---|---|---|
| **Capture** | `/social/capture` | Manual entry from a link and/or screenshots. Works with no setup. |
| **Mentions inbox** | `/social/mentions` | Every post that tags @heavensleaf, every caption or comment that @mentions you. One click adds the account as an influencer or prospect, or logs it as an influencer post with its likes/comments. |
| **Handle lookup** | `/social/lookup` | Type a username → followers, following, post count, bio, website, engagement rate, and the last 12 posts. Add as influencer, or refresh an existing one. |
| **Refresh from Instagram** | influencer profile | Re-pulls follower count, post count, and bio for a tracked influencer (Instagram + handle set). |
| **Auto-linking** | inbox | Mentions are matched to influencers by handle and to prospects by their Instagram field, including history when you add someone later. |

How mentions arrive:

- **Photo/video tags** — polled from the `/tags` edge every 6 hours by the
  `/api/cron/social-sync` Vercel cron, or on demand with **Sync now**.
- **Caption and comment @mentions** — pushed instantly by Meta to the
  webhook at `/api/webhooks/meta` (the `mentions` field). Meta has no
  polling endpoint for these, so the webhook is required.

Engagement rate = average (likes + comments) across the recent posts ÷
followers, as a percent. Rough guide for cigar/lifestyle accounts: 3%+ is
strong, under 1% with a big follower count is a yellow flag.

---

## One-time Meta setup

You need: the Heaven's Leaf Instagram account, a Facebook Page you admin,
and a Meta developer account (free). Budget an hour the first time.

### 1. Make Instagram a Business account and link the Page

1. Instagram app → Profile → menu → **Settings and privacy** → **Account
   type and tools** → **Switch to professional account** → **Business**.
2. Still in Instagram: **Settings** → **Business tools and controls** →
   **Connect a Facebook Page** → pick the Heaven's Leaf Page (create one
   in Facebook first if needed). The Page is what grants API access; the
   account itself stays exactly as it is.

### 2. Create the Meta app

1. Go to <https://developers.facebook.com/apps> → **Create app** → use case
   **Other** → type **Business** → name it `EmberOS`.
2. In the app dashboard, **Add product** → **Instagram** → choose
   **Instagram API with Facebook Login** (the one for Business accounts
   linked to a Page — not the "Instagram Login" variant).
3. **App settings → Basic**: copy **App ID** and **App Secret**. These are
   `META_APP_ID` and `META_APP_SECRET`.

### 3. Get a long-lived access token

1. Open **Tools → Graph API Explorer** (<https://developers.facebook.com/tools/explorer>).
2. Select the EmberOS app. Under **Permissions**, add:
   `instagram_basic`, `instagram_manage_comments`,
   `instagram_manage_insights`, `pages_show_list`,
   `pages_read_engagement`, `business_management`.
3. **Generate Access Token** → approve the dialog, selecting the Heaven's
   Leaf Page and Instagram account.
4. The token you get is short-lived (about an hour). Exchange it for a
   long-lived one (60 days) — either with **Tools → Access Token
   Debugger → Extend Access Token**, or:
   ```
   curl "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN"
   ```
5. For a token that **never expires**, use the long-lived user token to
   fetch a Page token — it inherits the long life and doesn't expire:
   ```
   curl "https://graph.facebook.com/v21.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
   ```
   Copy `access_token` for the Heaven's Leaf Page → `META_ACCESS_TOKEN`,
   and its `id` → `META_FACEBOOK_PAGE_ID`.

### 4. Find the Instagram Business ID

```
curl "https://graph.facebook.com/v21.0/PAGE_ID?fields=instagram_business_account&access_token=META_ACCESS_TOKEN"
```

The number under `instagram_business_account.id` is
`META_INSTAGRAM_BUSINESS_ID`. Sanity check the whole setup:

```
curl "https://graph.facebook.com/v21.0/IG_ID?fields=username,followers_count&access_token=META_ACCESS_TOKEN"
```

### 5. Set the env vars

In Vercel (Project → Settings → Environment Variables) and `.env.local`:

```
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_INSTAGRAM_BUSINESS_ID=
META_FACEBOOK_PAGE_ID=
META_WEBHOOK_VERIFY_TOKEN=   # any long random string you make up
```

Redeploy. `/settings` shows **Meta (Instagram scouting)** as Connected, and
`/social/lookup` starts working immediately. Tags appear after the first
**Sync now**.

### 6. Subscribe the webhook (caption + comment mentions)

1. App dashboard → **Webhooks** (left menu) → choose **Instagram** from the
   object dropdown → **Subscribe to this object**.
2. Callback URL: `https://YOUR-DOMAIN/api/webhooks/meta`  
   Verify token: the value you put in `META_WEBHOOK_VERIFY_TOKEN`.  
   Meta calls the URL once to verify; EmberOS answers the challenge.
3. In the field list, subscribe to **mentions**.
4. Make sure the Instagram account is subscribed to the app:
   ```
   curl -X POST "https://graph.facebook.com/v21.0/PAGE_ID/subscribed_apps?subscribed_fields=feed&access_token=META_ACCESS_TOKEN"
   ```
5. Test from another account: post a story or caption with @heavensleaf.
   It should appear in `/social/mentions` within seconds.

Webhook deliveries are signed with the app secret (`X-Hub-Signature-256`);
EmberOS rejects anything that doesn't verify.

### 7. App review (only when you want it live for real)

While the app is in **Development mode**, everything works for the
accounts listed as app admins/testers — that's you. To keep working after
Meta's tester limits or if another team member's account should be the
connected one, submit the app for review with the permissions above and a
short screen recording of the lookup and inbox. Approval usually takes a
few days. Development mode is fine indefinitely for a single-account setup.

---

## Limits and gotchas

- **Business discovery** only works for Business/Creator accounts. A
  personal account returns Meta error 110; EmberOS shows a friendly
  message and the screenshot flow remains the fallback.
- **Rate limits**: 200 calls per hour per user token, roughly. Handle
  lookups are one call each; a sync is one call. You will not hit this in
  normal use.
- **Hashtag search** (planned) is capped at 30 unique hashtags per rolling
  7 days per account.
- **Token expiry**: a Page token obtained via step 3.5 doesn't expire. If
  you used a 60-day user token instead, lookups start failing with
  "token has expired" — repeat step 3.
- Tobacco is a **restricted category for paid ads** on Meta. The read-only
  APIs used here and organic posting are unaffected.

## Code map

| Piece | File |
|---|---|
| Pure helpers (handle cleaning, engagement math, webhook parsing) + tests | `src/server/social/instagram.ts`, `instagram.test.ts` |
| Graph API calls (discovery, tags, mentioned media/comment, signature check) | `src/server/integrations/meta.ts` |
| Upserts + auto-linking | `src/server/social/sync.ts` |
| Server actions used by the UI | `src/server/actions/social.ts` |
| Inbox and lookup pages | `src/app/(app)/social/**`, `src/components/social/**` |
| Webhook and cron routes | `src/app/api/webhooks/meta/route.ts`, `src/app/api/cron/social-sync/route.ts` |
| Data | `SocialMention` in `prisma/schema.prisma` |
