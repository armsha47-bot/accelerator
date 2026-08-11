-- ═══════════════════════════════════════════════════════════════════════════
-- Accelerator — full Postgres schema for Supabase.
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Every user-owned table has Row Level Security restricting access to auth.uid().
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ──────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  age integer,
  position text,
  goals text[] default '{}',
  xp integer default 0,
  level integer default 1,
  streak integer default 0,
  longest_streak integer default 0,
  daily_xp_goal integer default 500,
  daily_calorie_goal integer default 2500,
  protein_goal integer default 150,
  carbs_goal integer default 300,
  fat_goal integer default 80,
  diet text default 'vegetarian',
  weight_unit text default 'lbs',
  onboarded boolean default false,
  last_active date,
  created_at timestamptz default now()
);

-- Auto-create a blank profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Daily AI plans ─────────────────────────────────────────────────────────
create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  morning jsonb default '[]',
  afternoon jsonb default '[]',
  evening jsonb default '[]',
  generated_at timestamptz default now(),
  unique (user_id, date)
);

-- ── Habits + completions ───────────────────────────────────────────────────
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  description text,
  category text,
  xp_reward integer default 10,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  habit_id uuid references habits(id) on delete cascade,
  date date,
  completed_at timestamptz default now(),
  unique (habit_id, date)
);

-- ── Weekly quests ──────────────────────────────────────────────────────────
create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  description text,
  xp_reward integer default 50,
  progress integer default 0,
  target integer default 1,
  completed boolean default false,
  week_start date,
  created_at timestamptz default now()
);

-- ── Nutrition ──────────────────────────────────────────────────────────────
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  meal_type text,
  food_name text,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  quantity numeric default 1,
  unit text default 'serving',
  logged_at timestamptz default now()
);

-- ── Training ───────────────────────────────────────────────────────────────
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  date date,
  notes text,
  completed_at timestamptz default now()
);

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references workouts(id) on delete cascade,
  exercise_name text,
  sets jsonb default '[]'
);

create table if not exists routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  exercises jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists physique_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  scan_type text default 'physique',
  score numeric,
  analysis text,
  logged_at timestamptz default now()
);

create table if not exists body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  weight_value numeric,
  unit text default 'lbs',
  date date,
  logged_at timestamptz default now()
);

-- ── Gamification ───────────────────────────────────────────────────────────
create table if not exists xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount integer,
  reason text,
  created_at timestamptz default now()
);

create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  badge_key text,
  earned_at timestamptz default now(),
  unique (user_id, badge_key)
);

-- Leaderboard (ghost + real users). Ghosts have is_ghost = true.
create table if not exists leaderboard_users (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  avatar_seed text,
  xp integer default 0,
  level integer default 1,
  is_ghost boolean default false,
  real_user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── Custom scheduled tasks ─────────────────────────────────────────────────
create table if not exists custom_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  description text,
  why_this_matters text,
  xp_reward integer default 15,
  category text,
  time_slot text,
  days_of_week integer[] default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists task_day_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task_id uuid,
  date date,
  action text
);

-- Which AI-plan / habit / custom tasks were completed on a given day.
create table if not exists task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task_key text,       -- 'ai:morning:0', 'custom:<uuid>', etc.
  date date,
  completed_at timestamptz default now(),
  unique (user_id, task_key, date)
);

-- ── Confidence / mindset ───────────────────────────────────────────────────
create table if not exists wins_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  description text,
  category text,
  created_at timestamptz default now()
);

create table if not exists ritual_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_type text,
  completed boolean default false,
  date date
);

-- ── Focus / check-ins / reviews ────────────────────────────────────────────
create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  label text,
  duration_minutes integer,
  cycles_completed integer default 0,
  completed boolean default false,
  date date,
  created_at timestamptz default now()
);

create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  mood integer,
  sleep_hours numeric,
  water_glasses integer default 0,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  week_start date,
  content text,
  read boolean default false,
  generated_at timestamptz default now()
);

create table if not exists ai_habit_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  content text,
  week_start date,
  read boolean default false
);

-- ── Home completion / calendar ─────────────────────────────────────────────
create table if not exists daily_completion_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  total_tasks integer default 0,
  completed_tasks integer default 0,
  all_complete boolean default false,
  xp_earned integer default 0,
  unique (user_id, date)
);

create table if not exists home_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  section_order jsonb,
  hidden_sections text[] default '{}'
);

-- ── Countdowns / goals ─────────────────────────────────────────────────────
create table if not exists countdown_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text,
  event_date date,
  color text,
  icon_key text,
  created_at timestamptz default now()
);

create table if not exists goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  target_date date,
  current_value numeric,
  target_value numeric,
  unit text,
  notes text,
  completed boolean default false,
  completed_at timestamptz
);

-- ── Academic / AMC ─────────────────────────────────────────────────────────
create table if not exists study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  subject text,
  duration_minutes integer,
  topics text,
  notes text,
  difficulty integer,
  date date,
  created_at timestamptz default now()
);

create table if not exists amc_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  exam_type text,
  year integer,
  score integer,
  time_minutes integer,
  algebra_correct integer,
  geometry_correct integer,
  number_theory_correct integer,
  combinatorics_correct integer,
  probability_correct integer,
  date date
);

-- ── Health logs ────────────────────────────────────────────────────────────
create table if not exists sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date,
  hours_slept numeric,
  bedtime time,
  wake_time time,
  logged_at timestamptz default now()
);

create table if not exists injury_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  body_part text,
  severity integer,
  injury_type text,
  notes text,
  resolved boolean default false,
  date date,
  resolved_date date
);

-- ── AI coach chat history ──────────────────────────────────────────────────
create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  role text,               -- 'user' | 'assistant'
  content text,
  created_at timestamptz default now()
);

-- ── Web Push subscriptions ─────────────────────────────────────────────────
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text unique,
  p256dh text,
  auth text,
  reminder_time time default '07:30',
  created_at timestamptz default now()
);

-- ── Helpful indexes ────────────────────────────────────────────────────────
create index if not exists idx_food_logs_user_date on food_logs (user_id, date);
create index if not exists idx_habit_comp_user_date on habit_completions (user_id, date);
create index if not exists idx_task_comp_user_date on task_completions (user_id, date);
create index if not exists idx_xp_user on xp_transactions (user_id, created_at desc);
create index if not exists idx_coach_user on coach_messages (user_id, created_at);
create index if not exists idx_leaderboard_xp on leaderboard_users (xp desc);

-- ═══════════════════════════════════════════════════════════════════════════
-- Row Level Security. Owner-only for every user table; leaderboard is readable
-- by all authenticated users (writes go through the service role).
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','daily_plans','habits','habit_completions','quests','food_logs',
    'workouts','routines','physique_logs','body_weight_logs','xp_transactions',
    'user_badges','custom_tasks','task_day_overrides','task_completions',
    'wins_journal','ritual_sessions','focus_sessions','daily_checkins',
    'weekly_reviews','ai_habit_insights','daily_completion_status',
    'home_preferences','countdown_events','goal_milestones','study_sessions',
    'amc_attempts','sleep_logs','injury_logs','coach_messages','push_subscriptions'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists owner_all on %I;', t);
    if t = 'profiles' then
      execute 'create policy owner_all on profiles for all using (auth.uid() = id) with check (auth.uid() = id);';
    else
      execute format(
        'create policy owner_all on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
        t
      );
    end if;
  end loop;
end $$;

-- workout_exercises is owned transitively via its parent workout.
alter table workout_exercises enable row level security;
drop policy if exists owner_via_workout on workout_exercises;
create policy owner_via_workout on workout_exercises for all
  using (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- Leaderboard: any authenticated user can read. Ghost rows and XP recomputes are
-- written by the service role (which bypasses RLS). A user may insert/update only
-- their OWN row (real_user_id = their uid) — onboarding relies on this to add the
-- user to the board.
alter table leaderboard_users enable row level security;
drop policy if exists leaderboard_read on leaderboard_users;
create policy leaderboard_read on leaderboard_users for select using (auth.role() = 'authenticated');
drop policy if exists leaderboard_insert_own on leaderboard_users;
create policy leaderboard_insert_own on leaderboard_users for insert
  with check (real_user_id = auth.uid());
drop policy if exists leaderboard_update_own on leaderboard_users;
create policy leaderboard_update_own on leaderboard_users for update
  using (real_user_id = auth.uid()) with check (real_user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: 20 ghost leaderboard users.
-- ═══════════════════════════════════════════════════════════════════════════
-- Steep competitive ladder: the top 3 are Apex (Level 20, millions of XP) and
-- would take a real user years; the field descends to reachable near-term
-- targets at the bottom. XP/levels track lib/level-utils.ts thresholds.
insert into leaderboard_users (display_name, avatar_seed, xp, level, is_ghost) values
  ('Marcus K.', 'marcus7',  12500000, 20, true),
  ('Priya N.',  'priyan',    9600000, 20, true),
  ('Diego R.',  'diegor',    8000000, 20, true),
  ('Jordan F.', 'jordan12',  1150000, 15, true),
  ('Aisha M.',  'aisham',     640000, 13, true),
  ('Kai R.',    'kai99',      410000, 12, true),
  ('Leo V.',    'leov',       270000, 11, true),
  ('Dev S.',    'devs22',     180000, 10, true),
  ('Sofia T.',  'sofiat',     120000,  9, true),
  ('Tyler B.',  'tyler8',      82000,  9, true),
  ('Chen W.',   'chenw',       55000,  8, true),
  ('Noah C.',   'noah33',      38000,  7, true),
  ('Maya P.',   'mayap',       26000,  6, true),
  ('Omar H.',   'omarh',       17000,  6, true),
  ('Ethan M.',  'ethanm',      11000,  5, true),
  ('Zoe K.',    'zoek',         7000,  4, true),
  ('Liam D.',   'liamd',        4300,  4, true),
  ('Ava S.',    'avas',         2400,  3, true),
  ('Sam L.',    'saml44',       1100,  2, true),
  ('Ben Q.',    'benq',          400,  1, true)
on conflict do nothing;
