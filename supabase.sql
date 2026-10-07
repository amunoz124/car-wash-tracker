-- Fresh install schema for Car Wash Tracker v1.2+
-- Run this entire file in Supabase SQL Editor ONLY for a new/empty project.
-- If you already used v1.1, run migration-v1.2.sql instead.

create extension if not exists pgcrypto;

create table if not exists public.dealerships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  rate numeric(10,2) not null check (rate >= 0),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealerships_id_user_unique unique (id, user_id)
);

create unique index if not exists dealerships_user_name_unique
  on public.dealerships (user_id, lower(trim(name)));

create table if not exists public.dealership_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dealership_id uuid not null,
  weekday int not null check (weekday between 0 and 6),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint dealership_schedule_dealer_user_fk
    foreign key (dealership_id, user_id)
    references public.dealerships(id, user_id)
    on delete cascade,
  constraint dealership_schedule_one_day unique (user_id, dealership_id, weekday),
  constraint dealership_schedule_id_user_unique unique (id, user_id)
);

create table if not exists public.daily_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  action text not null check (action in ('add','remove')),
  dealership_schedule_id uuid,
  constraint daily_overrides_schedule_user_fk
    foreign key (dealership_schedule_id, user_id)
    references public.dealership_schedule(id, user_id)
    on delete cascade,
  dealership text,
  rate numeric(10,2),
  created_at timestamptz not null default now(),
  constraint daily_overrides_action_check check (
    (action='remove' and dealership_schedule_id is not null)
    or
    (action='add' and dealership is not null and rate is not null and rate >= 0)
  )
);

create table if not exists public.work_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  route_key text not null,
  dealership text not null,
  rate_snapshot numeric(10,2) not null check (rate_snapshot >= 0),
  cars int not null default 0 check (cars >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, work_date, route_key)
);

alter table public.dealerships enable row level security;
alter table public.dealership_schedule enable row level security;
alter table public.daily_overrides enable row level security;
alter table public.work_entries enable row level security;

revoke all on table public.dealerships from anon, authenticated;
revoke all on table public.dealership_schedule from anon, authenticated;
revoke all on table public.daily_overrides from anon, authenticated;
revoke all on table public.work_entries from anon, authenticated;

grant select, insert, update, delete on table public.dealerships to authenticated;
grant select, insert, update, delete on table public.dealership_schedule to authenticated;
grant select, insert, update, delete on table public.daily_overrides to authenticated;
grant select, insert, update, delete on table public.work_entries to authenticated;

create policy "dealership select own" on public.dealerships for select to authenticated using ((select auth.uid()) = user_id);
create policy "dealership insert own" on public.dealerships for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dealership update own" on public.dealerships for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dealership delete own" on public.dealerships for delete to authenticated using ((select auth.uid()) = user_id);

create policy "schedule select own" on public.dealership_schedule for select to authenticated using ((select auth.uid()) = user_id);
create policy "schedule insert own" on public.dealership_schedule for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "schedule update own" on public.dealership_schedule for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "schedule delete own" on public.dealership_schedule for delete to authenticated using ((select auth.uid()) = user_id);

create policy "override select own" on public.daily_overrides for select to authenticated using ((select auth.uid()) = user_id);
create policy "override insert own" on public.daily_overrides for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "override update own" on public.daily_overrides for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "override delete own" on public.daily_overrides for delete to authenticated using ((select auth.uid()) = user_id);

create policy "entries select own" on public.work_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "entries insert own" on public.work_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "entries update own" on public.work_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "entries delete own" on public.work_entries for delete to authenticated using ((select auth.uid()) = user_id);
