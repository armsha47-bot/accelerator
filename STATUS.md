# Build status

**The app compiles, type-checks, and runs.** `npm run typecheck` is clean and
`npm run build` succeeds (38 routes). It was verified in a browser in keyless
demo mode — Home, Profile (with the 10-crest ladder), Train, and Leaderboard all
render correctly. See "Running it" below.

This is the honest map of what exists. The spec is large (~30 feature areas);
the foundation + every core loop + most feature pages are built.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

`.env.local` currently ships with **keyless demo mode** on
(`NEXT_PUBLIC_DEMO_MODE=true`) — placeholder backend values plus mock data on
Home/Profile/Leaderboard/Calendar/Stats so the UI renders with no database. To go
live: set the real keys from `.env.example`, run `supabase/schema.sql`, and set
`NEXT_PUBLIC_DEMO_MODE=false` (or delete it). A harmless dev-only React "Fast
Refresh" warning can appear in the console during client navigations; it does not
occur in `next build` / `next start`.

> Security note: `next@14.2.15` has a published advisory. Bump when convenient:
> `npm i next@latest-14` (or the latest patched 14.2.x) and re-run the build.

## ✅ Done and wired

- **Project scaffold** — Next 14 App Router, TypeScript, Tailwind design system
  (exact brand tokens + rounded/soft component classes), next-pwa, ESLint config,
  `vercel.json` crons, `.env.example`.
- **Database** — full `supabase/schema.sql`: every table from the spec, RLS
  owner-policies on all user tables, signup→profile trigger, ghost seed, indexes.
- **Auth** — login / signup / sign-out, session middleware, route gating.
- **Onboarding** — 3 steps, sets goals + name/age, flips `onboarded`, adds the
  user to the leaderboard.
- **Home** — top bar with live level crest + streak, week-completion bubbles,
  concentric task/habit donut (animated), XP progress bar with goal state, daily
  plan (3 slots, checkable with "why this matters"), habits, quick-actions row,
  daily quote. Task/habit completion awards XP optimistically + full-day bonus.
- **LevelCrest** — all 10 SVG crests (faceted gems, radial gradients, highlight,
  glow on 4+, wings/crown/filigree/bolts, animated pulse on 9-10, radiant beams
  on 10). Used on Home, Profile, Leaderboard.
- **Profile** — user card, level progress + crest ladder, stats grid, badge grid
  (14 badges), goals, logout.
- **Leaderboard** — ranked ghosts + real users, DiceBear avatars, your-rank card,
  weekly challenge, invite-copy.
- **AI Coach** — streaming chat, history persisted to `coach_messages`.
- **Nutrition** — calorie ring + macro bars, Nutritionix search→log, meal
  grouping, delete, water tracker (awards XP at 8 glasses).
- **Train** — workout logger (exercises/sets/volume, saves + XP), three camera
  scan cards (physique/posture/outfit via Claude vision with client-side image
  compression), body-weight log.
- **Focus** — Pomodoro with presets, full-screen ring, hold-to-exit, cycle/block
  XP + `focus_sessions` logging.
- **Breathing** — box + 4-7-8 with animated expanding circle, XP on completion.
- **Confidence** — daily affirmation, hype mode (with speech synthesis), wins
  journal.
- **Stretch** — 3 static guided routines + AI-custom (from last workout), timed
  step-through, XP on completion.
- **Tasks** — manage custom tasks (bottom-sheet modal with day picker + slot +
  category + XP slider) and habits.
- **Countdown** — seeded + custom countdowns, "this week" state, "Prepare" → Coach.
- **API routes** — `generate-plan` (with fallback), `chat`, `scan-photo`,
  `food-search`, `confidence`, `generate-stretch`, `award-xp`, and cron
  `update-ghosts` / `weekly-quests` / `weekly-review` (all CRON_SECRET-protected).

## ✅ Added in the second pass

- **Celebrations** — global CelebrationProvider: level-up modal (with confetti +
  Canvas share image) and badge-unlock toasts, fired from `useXP` on the
  `/api/award-xp` response.
- **Home** — custom scheduled tasks now merge into the daily plan (spec #12),
  task overflow menu (complete / remove-today), Weekly Quests section, and the
  Weekly Review card (dismiss for XP).
- **New pages** — Study/AMC tracker (with score-trend chart), Sleep (colored bar
  chart), Injury & Soreness log, Pre-Event Ritual (timed 5-step sequence),
  Calendar month view, Goal Milestones, All-time Stats, Settings.
- **Recovery score** — chip on Train (sleep/volume/mood formula + guidance).
- **Data export** — `/api/export` builds a ZIP of CSVs (dependency-free zip
  writer in `lib/zip.ts`).
- **Charts** — dependency-free SVG BarChart / LineChart / Heatmap in
  `components/shared/Charts.tsx`.

## ✅ v2 redesign pass (monochrome + 20 levels)

Aligned to the revised spec; builds clean and verified in-browser:
- **Monochrome design system** — `#080808` bg, `#111` cards, `#1A1A1A` elevated,
  `#F0F0F0` text; color reserved for meaning (green=done, gold=XP, red=alert,
  indigo=the one CTA). White-glow utilities (`.glow-text/.glow-svg`) + shimmer.
- **Binary week bubbles** — green (all complete) or dark only; no partial arcs.
- **Single-ring donut** — one white glowing arc = tasks + habits combined.
- **White XP bar** with a glowing leading edge (gold when goal hit).
- **20-level crest system** — `LevelCrest.tsx` rebuilt for Recruit→Apex with
  per-tier gems (4→28 facets), escalating glow, wings/crown/bolts/swords/banner,
  radiant beams at L20, breathe + gem-pulse + spin animations, and an
  IntersectionObserver that pauses them off-screen. Thresholds + names updated to
  20 levels in `level-utils.ts`.
- **Fire streak ignition** (`FireStreakCounter.tsx`, framer-motion) — plays once
  per new streak day (localStorage-gated).
- **canvas-confetti** level-up modal with a spring crest reveal.
- Installed **framer-motion** + **canvas-confetti**.

**Animation polish ported (verified live):**
- Task/habit **checkbox sequence** — border spin 360° + color flash + checkmark
  `pathLength` draw, then card fade-to-60% + shift and an animated **strikethrough**.
- **NumberCounter** count-ups on the donut center, Home XP, and Profile total XP.
- **Page transitions** — `app/(app)/template.tsx` fades/slides each navigation.
- **Staggered** habit-row entrances; **skeleton shimmer** on the Home loader.
- Demo mode now completes tasks/habits locally so the animations are viewable
  keyless.

**Food photo scan (Nutrition)** — "📷 Scan a photo of your food" → client
compression → Claude vision (`/api/scan-photo` kind=food) → **editable** detected
items → log all (+20 XP). Complements the existing physique/posture/outfit scans.

**Fourth pass (monochrome + interactions):**
- **White theme everywhere** — swept indigo accents to white across all pages
  (links, buttons, active pills/nav, rings, glows). Bottom nav active is white +
  glow. Functional color kept for meaning: green (completion/bubbles), gold (XP),
  red (alerts/undo). Checkmark stays visible (dark on the white checkbox fill).
  Primary buttons are now white-on-black.
- **Uncheck** tasks & habits — completing again toggles off (removes the
  completion row, reverses XP, shows a red "−N XP" float, updates the ring/status).
- **Water tracker** — works in demo, is uncheckable (tap a filled glass to lower),
  and animates each glass (fill + glow + tap-spring).
- **Food search** — works in demo with mock results; logging + photo scan both
  add to the day's log keyless.
- **Day-bubble particle burst** — today's bubble springs + emits a particle
  burst the moment every task + habit is done (`ParticleBurst`, wired via Home).
- **Customizable / drag-reorder Home** — `useHomePrefs` (localStorage) +
  `CustomizeHomeSheet` (framer-motion `Reorder`): drag to reorder sections, eye
  to hide; Daily plan is locked "always on". Verified working in-browser.
- `NumberCounter` count-ups + `template.tsx` page transitions + staggered lists
  from the prior pass remain.

## ✅ Added in the third pass

- **App icons** — generated via `scripts/gen-icons.py` (dependency-free PNG
  writer): black rounded tile, glowing white infinity mark. Outputs
  icon-192 / icon-512 (maskable) / apple-touch-icon / favicon. The in-app logo
  (`components/shared/InfinityMark.tsx`) matches, used on login + onboarding.
- **In-app tutorial tour** — `components/shared/TutorialTour.tsx`: 5-step
  spotlight overlay on first Home launch, gated by a localStorage flag.
- **Push notifications (Web Push + VAPID)** — custom service worker
  (`worker/index.js`, bundled by next-pwa) with push + notificationclick;
  `lib/push-server.ts` (send + prune dead subs) and `lib/push-client.ts`
  (subscribe/unsubscribe); routes `/api/push/subscribe`, `/api/push/send`, and
  `/api/cron/reminders?kind=plan|streak|quest`; a Reminders toggle + test button
  in Settings; `push_subscriptions` table (in schema + `migrations/002`);
  `scripts/gen-vapid.mjs` to mint keys. **Note:** push only fires from a
  production build over HTTPS (next-pwa disables the SW in dev), and Vercel Cron
  drives the reminder schedules (see `vercel.json`).

## ⬜ Not yet built (scoped for next passes)

- **Customizable Home** (drag-to-reorder / hide sections; `home_preferences`).
- **AI habit insight** card, nutrition-history AI insight, social-share entry
  points beyond level-up, and per-template chart pages (volume trend, weight
  trend, scan history) — data + primitives exist, just not surfaced everywhere.

## 🧩 Loose ends to close before a clean prod run

1. **App icons** — add `public/icon-192.png`, `icon-512.png`,
   `apple-touch-icon.png` (manifest references them).
2. **Streak increment** — `award-xp` updates `last_active` but a daily
   streak-increment/reset job (or on-load check) still needs wiring.
3. **`daily_completion_status.total_tasks`** should also count habits + customs
   for the week bubbles to be fully accurate.
4. Run `npm run typecheck` on a Node machine and fix any drift (there may be minor
   Supabase generic-typing tweaks — none of it was compiled here).
