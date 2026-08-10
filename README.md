# Accelerator

A personal self-improvement & performance PWA — AI daily plans, gamified XP/levels,
food logging, training, focus tools, and an AI coach. Built with **Next.js 14 (App
Router)**, **Supabase** (Postgres + Auth), **Tailwind**, **Anthropic Claude**, and
**Nutritionix**. Installable to an iPhone Home Screen; dark, rounded, mobile-first.

> **Heads up:** this project was scaffolded in an environment without Node, so it
> has **not been `npm install`-ed, built, or run** here. Run the setup below on a
> machine with Node 18+ to install, typecheck, and launch it. See
> [`STATUS.md`](STATUS.md) for exactly what's implemented vs. still stubbed.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

Type-check without running:

```bash
npm run typecheck
```

## Environment variables (`.env.local`)

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (server-only — never exposed to the browser) |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NUTRITIONIX_APP_ID` / `NUTRITIONIX_API_KEY` | developer.nutritionix.com |
| `CRON_SECRET` | any random string; used to protect the `/api/cron/*` routes |

## Database

1. Create a Supabase project.
2. Open the **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql) in
   full. It creates every table, enables **Row Level Security** (owner-only), adds
   a trigger that auto-creates a `profiles` row on signup, and seeds the 8 ghost
   leaderboard users.
3. (Optional) In **Auth → Providers**, disable "Confirm email" for a smoother dev
   signup, or leave it on for production.

## Architecture

- **`app/(app)/*`** — the five bottom-nav tabs (Home, Train, Nutrition,
  Leaderboard, Profile) plus Coach, Confidence, Focus, Breathing, Stretch, Tasks,
  Countdown. These are client components that read/write Supabase directly (RLS
  keeps them safe) and call server API routes for anything needing a secret.
- **`app/(auth)/*`** + **`app/onboarding`** — email/password auth and the 3-step
  onboarding that sets goals and flips `profiles.onboarded`.
- **`app/api/*`** — server routes holding the secrets: `generate-plan`, `chat`
  (streaming), `scan-photo` (Claude vision), `food-search` (Nutritionix proxy),
  `confidence`, `generate-stretch`, `award-xp`, and three `cron/*` jobs.
- **`lib/*`** — Supabase clients (`browser`/`server`/`admin`), Anthropic + models,
  Nutritionix, XP/level math, badge catalog + checker, quotes, image compression.
- **`components/*`** — layout (bottom nav, page wrapper), Home widgets (donut,
  week bubbles), and the signature **`LevelCrest`** (10 SVG rank crests).
- **`middleware.ts`** — refreshes the Supabase session and gates app routes.

### The XP loop

Client actions fire `useXP().award(amount, reason)` → optimistic "+N XP" float +
haptic buzz → `POST /api/award-xp` updates the profile, logs an `xp_transaction`,
recomputes level via `lib/level-utils`, mirrors the leaderboard row, and runs
`checkBadges()`. Level thresholds and crest names live in `lib/level-utils.ts`.

## Deployment (Vercel)

1. Import the repo, set the same env vars in Vercel.
2. `vercel.json` already declares the three cron schedules (ghost XP daily, weekly
   quests Monday, weekly review Sunday). Add `CRON_SECRET` and Vercel Cron will
   send it as a Bearer token automatically.

## Still to add

App icons (`public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) are
referenced by the manifest but not yet generated — drop in a 512×512 PNG (indigo
lightning bolt on `#0A0A0F`) and its downscales. See `STATUS.md` for the full list.
