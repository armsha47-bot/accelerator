# Accelerator — Handoff for a new Claude Code session

**Read this first.** It's the full context for continuing work on this app.

---

## 1. What this is

**Accelerator** — a premium, dark, mobile-first PWA for a 15-year-old (Armaan):
soccer performance, AMC math, confidence, and nutrition. AI daily plans, gamified
XP + a 20-rank crest system, food/workout/study/sleep logging, focus timer,
confidence tools, leaderboard, and an AI coach.

**Design language:** monochrome black/white, near-black `#080808` bg, `#111` cards,
white text with subtle glow. Color is functional-only: **green** = complete,
**gold** = XP, **red** = alerts, **indigo** was removed as an accent (swept to
white). Everything is rounded, soft, animated (framer-motion).

## 2. Where it lives & how to run it

- **Project root:** `/Users/squid/accelerator` (a Next.js 14 App Router app).
- **Node is installed locally** (this environment had none): `/Users/squid/.local/node/bin`
  (v20.18.1). Prefix shell commands with:
  ```bash
  export PATH="/Users/squid/.local/node/bin:$PATH"
  ```
- **Dev server** (the managed preview tool can't reach the sibling-dir node, so run
  it directly, backgrounded):
  ```bash
  cd /Users/squid/accelerator
  nohup /Users/squid/.local/node/bin/node node_modules/next/dist/bin/next dev -p 3000 > /tmp/accel-dev.log 2>&1 &
  ```
  Then open the Browser pane at `http://localhost:3000` (use `preview_start` with
  `{url}`, or `navigate`).
- **Typecheck / build:** `npm run typecheck` and `npm run build`.

### ⚠️ Critical gotchas (these bit us repeatedly)
1. **`npm run build` clobbers the dev server's `.next`** (they share it). After any
   `build`, kill + restart the dev server and `rm -rf .next`, or the browser 404s
   on chunks / throws stale RSC errors.
2. **After a dev restart, the in-app browser caches old chunks** → you'll see
   "Module not found" or "Failed to fetch RSC payload" that are *stale*. Fix: hard
   reload (`window.location.href='/?x='+Date.now()`) or open a fresh tab. Confirm
   real errors with `npm run build`, not the browser console alone.
3. The in-app browser's SPA router sometimes lands on the wrong route after
   restarts and returns stale `read_page` trees. Prefer full-URL `navigate` + a
   screenshot to confirm where you actually are.
4. `next@14.2.15` has a published security advisory — bump to a patched 14.2.x when
   convenient (`npm i next@latest-14`) and re-verify the build.

## 3. Demo mode (important)

There is **no backend connected** (placeholder env). The app runs in **keyless demo
mode**: `.env.local` has `NEXT_PUBLIC_DEMO_MODE=true`, which (a) makes `middleware.ts`
skip the auth gate, and (b) makes pages use mock data + **localStorage persistence**
instead of Supabase.

- Demo persistence helper: **`lib/demo-store.ts`** (`demoGet`/`demoSet`, namespaced
  `demo:`). Nearly every page has a `if (DEMO) { … demoGet/demoSet … return; }`
  branch so buttons work and state survives navigation.
- Mock data + `DEMO` flag: **`lib/demo.ts`**.
- **To go live:** create a Supabase project, run `supabase/schema.sql` (+ the
  `supabase/migrations/*.sql`), fill real keys in `.env.local`, set
  `NEXT_PUBLIC_DEMO_MODE=false`. Then `/signup` creates real accounts.

## 4. Architecture / key files

- `app/(app)/*` — the tabs + feature pages (Home, Train, Nutrition, Leaderboard,
  Profile, Coach, Confidence, Focus, Breathing, Stretch, Tasks, Countdown, Ritual,
  Calendar, Goals, Stats, Study, Sleep, Injury, Settings). Client components.
- `app/(app)/layout.tsx` — bottom nav + `CelebrationProvider`. `template.tsx` —
  per-navigation page transition.
- `app/(auth)/{login,signup}` + `app/onboarding` — auth + first-run.
- `app/api/*` — server routes holding secrets: `generate-plan`, `chat` (streaming),
  `scan-photo` (Claude vision), `food-search` (Nutritionix), `recipes`,
  `confidence`, `generate-stretch`, `award-xp`, `export` (ZIP), `push/*`, and
  `cron/*` (ghosts, weekly-quests, weekly-review, reminders).
- `lib/` — `supabase.ts` (browser) vs **`supabase-server.ts`** (serverClient/
  adminClient — NEVER import server client into a client component; that was a real
  build-breaker). `anthropic.ts`, `nutritionix.ts`, `food-db.ts` (offline food DB),
  `xp-utils.ts`, `level-utils.ts`, `badges.ts`/`badge-checker.ts`, `recovery.ts`,
  `demo.ts`, `demo-store.ts`, `share.ts`, `zip.ts`, `image.ts`, `push-*.ts`.
- `components/shared/LevelCrest.tsx` — **the 20 animated rank crests** (heavy SVG).
- `hooks/` — `useXP` (award + float + celebration dispatch), `useHomePrefs`
  (drag-reorder Home), `useProfile` etc.
- `supabase/schema.sql` — full schema, RLS owner-policies, ghost seed. Migrations in
  `supabase/migrations/`.

### XP / levels
`lib/level-utils.ts` holds the **20-level** thresholds (steep curve, ~8.3M XP to L20)
and `CREST_NAMES`. `useXP.award(amount, reason)` → optimistic float → `/api/award-xp`
(updates profile, logs xp_transaction, recomputes level, runs badge checker) →
dispatches a celebration (level-up modal + confetti, badge toast). Uncheck passes a
negative amount (shows a red "−N XP" float).

## 5. What's built (working)

- Monochrome design system, bottom nav, page transitions, skeleton shimmer.
- **Home**: level crest + fire-streak counter (ignites once/day), **binary** week
  bubbles (green/dark only) with particle burst on all-complete, **single white
  glowing donut**, white XP bar, daily plan (AI + merged custom tasks) with full
  checkbox animation + **uncheck**, habits, weekly quests (uncheckable), quick
  actions, quote, weekly-review card, **drag-reorder "Customize" sheet**, tutorial
  tour (once).
- **Profile**: 20-crest ladder, inline **pencil edit** for name + position, level
  progress, stats, 14 badges, goals, more-hub, logout.
- **Nutrition**: calorie ring + macro bars, **pencil editor for calorie + macro
  goals**, real **offline food DB** search (`lib/food-db.ts`) + Nutritionix in real
  mode, food **photo scan** (`capture="environment"` → iPhone camera), water tracker
  (animated, uncheckable), **"What should I eat?"** AI recipes using remaining macros
  + diet, today's log (deletable).
- **Train**: workout logger (saves; no longer hangs), recovery chip (now white for
  the "good to go" band), physique/posture/outfit scans, **body-weight log + trend
  graph + history**, recent workouts, quick links.
- **Settings**: name, position, calorie/XP goals, **macro goals**, **diet**
  (vegetarian/vegan/meat → feeds recipes), reminders toggle (Web Push), export data.
- Study/AMC, Sleep (+graph), Injury, Wins, Goals, Countdown, Focus (Pomodoro),
  Breathing, Confidence (affirmation/hype — canned in demo), Ritual, Stretch
  (+AI-custom, canned in demo), Calendar, Stats, Leaderboard (ghosts + DiceBear).
- **Delete/uncheck is everywhere**: tasks, habits, quests, foods, water, sleep,
  study, AMC, wins, goals, workouts, body weight, injuries, custom tasks/habits.
- PWA: manifest, icons (black tile + glowing white ∞, generated by
  `scripts/gen-icons.py`), custom service worker (`worker/index.js`) with push.
- **All of the above is demo-functional** (localStorage-persisted) and
  `npm run build` is green (38 routes).

## 6. What is NOT done / needs the real backend

- **AI Coach chat** and the **camera photo scans** (physique/posture/outfit/food)
  genuinely need the live Anthropic API (and a real device camera for scans). In
  demo they can't work — consider showing a "connect a backend" message.
- Real auth / multi-user, real Nutritionix, real push delivery, Vercel cron — all
  require deploying with keys.
- Some polish from the original spec is partial: nutrition/volume charts beyond what
  exists, AI habit-insight card surfacing, social-share beyond level-up.
- `demoProfile.level` (=4) is now stale vs the harder curve (3,820 XP = L3); the UI
  recomputes level from XP so it's cosmetically fine, but you may want to reconcile.

## 7. How to continue

Open a Claude Code session in **`/Users/squid/accelerator`** (so file edits target
this app). Read this file + `STATUS.md`. Run the dev server (§2), work in demo mode,
and remember the build/restart gotchas (§2). The most valuable next steps: connect a
real Supabase project to make everything persist for real, then wire the AI features
end-to-end.
