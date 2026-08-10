-- Web Push subscriptions. Run after schema.sql on an existing project.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text unique,
  p256dh text,
  auth text,
  reminder_time time default '07:30',
  created_at timestamptz default now()
);

create index if not exists idx_push_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;
drop policy if exists owner_all on push_subscriptions;
create policy owner_all on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
