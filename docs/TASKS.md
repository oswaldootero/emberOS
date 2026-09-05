# Tasks — assign work, get pinged

`/tasks` is the team to-do list. A task has a title, optional notes, an
assignee, a due date (a plain date, no time), a priority, tags, and
optionally the record it's about: a customer, prospect, influencer, or
invoice. Open tasks assigned to you appear at the top of the **Today**
board, ranked with everything else by urgency.

## Creating tasks in context

Every detail page has a **New task** button that pre-fills the link and a
sensible title:

| Where | Button | Pre-filled |
|---|---|---|
| Prospect profile | Assign a follow-up | "Follow up with <business>", tag `prospecting`, assignee = the prospect's owner |
| Customer profile | New task | "Follow up with <business>", tag `customer` |
| Invoice with a balance | Assign collection | "Collect $X from <customer> (INV-…)", tag `collections` |
| Influencer profile | New task | "Check in with <name>", tag `influencer`, assignee = their owner |
| Mentions inbox row | Task | "Follow up with @handle", tag `instagram` |
| Hashtag brief (Today / Find accounts) | Make it a task | today's hashtag work, tag `hashtag`, due today |
| Today board / Tasks page | New task | blank |

Due-date quick picks: Today, Tomorrow, In 3 days, Next week, No date.

## Notifications

When a task is assigned to someone other than the person creating it, the
assignee gets:

- **A push notification** on every device where they enabled
  notifications (below), and
- **An email** with the title, notes, due date and a button into EmberOS.

Every morning (the `daily-jobs` cron, 11:00 UTC / 7am ET) each assignee
with tasks due today or overdue gets one push and one email listing them.

### Enabling push on a device

1. Open EmberOS in the browser, or — on iPhone — first **Share → Add to
   Home Screen** and open it from there (iOS only allows push for
   installed web apps).
2. Go to **Tasks** or **Settings** and tap **Enable notifications**. A
   test ping confirms it works.
3. Turn it off any time from the same place. Each device is independent.

### One-time setup (env vars)

**Push** — generate a VAPID key pair once and set on Vercel + `.env.local`:

```
node -e "console.log(require('web-push').generateVAPIDKeys())"
NEXT_PUBLIC_VAPID_PUBLIC_KEY=…
VAPID_PRIVATE_KEY=…
VAPID_SUBJECT=mailto:you@yourdomain.com
```

Keys for local dev were generated on 2026-09-05 and are in `.env.local`;
use the same pair in Vercel so subscriptions made on production keep working.

**Email** — free account at <https://resend.com>:

1. Create an API key → `RESEND_API_KEY`.
2. To email teammates, add and verify your sending domain (DNS records,
   ~10 min) and set `EMAIL_FROM="EmberOS <notifications@yourdomain.com>"`.
   Without a verified domain Resend only delivers to your own account email.

Check what production has configured at `/api/health` (public, no secrets): `push`, `email`, `instagram` booleans plus the live commit.

Both are optional. Missing config is skipped silently and logged in the
audit trail; the task itself is always created.

## Code map

| Piece | File |
|---|---|
| Pure date/urgency/reminder helpers + tests | `src/server/tasks/logic.ts`, `logic.test.ts` |
| Loaders (list, context, Today rows) | `src/server/tasks.ts` |
| Server actions (CRUD, push subscriptions, test push) | `src/server/actions/tasks.ts` |
| Notifications: email (Resend), push (web-push), task notify + reminders | `src/server/notifications/*` |
| Pages and components | `src/app/(app)/tasks/**`, `src/components/tasks/*`, `src/components/notifications/push-toggle.tsx` |
| Service worker push handlers | `src/app/sw.ts` |
| Daily cron (reminders + hashtag brief + Instagram tags) | `src/app/api/cron/daily-jobs/route.ts` |
| Data | `Task`, `PushSubscription` in `prisma/schema.prisma` |
