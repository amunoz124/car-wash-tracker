-- Car Wash Tracker v1.1 -> v1.2 migration
-- Run this ONCE in Supabase SQL Editor if you already used the v1.1 schema.
-- It keeps historical work_entries and converts repeated weekly rows into:
--   1 dealership record + multiple weekday schedule assignments.

begin;

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

-- Create one dealership per user/name. If old duplicate rows have different rates,
-- the most recently created old row supplies the current rate.
with ranked as (
  select
    user_id,
    trim(dealership) as name,
    rate,
    sort_order,
    created_at,
    row_number() over (
      partition by user_id, lower(trim(dealership))
      order by created_at desc, id desc
    ) as rn
  from public.weekly_schedule
)
insert into public.dealerships (user_id, name, rate, sort_order, created_at, updated_at)
select user_id, name, rate, sort_order, created_at, now()
from ranked
where rn = 1
on conflict do nothing;

-- Convert each old weekday row into a linked weekday assignment.
insert into public.dealership_schedule (user_id, dealership_id, weekday, sort_order, created_at)
select
  w.user_id,
  d.id,
  w.weekday,
  min(w.sort_order),
  min(w.created_at)
from public.weekly_schedule w
join public.dealerships d
  on d.user_id = w.user_id
 and lower(trim(d.name)) = lower(trim(w.dealership))
group by w.user_id, d.id, w.weekday
on conflict (user_id, dealership_id, weekday) do nothing;

-- Point one-day removals at the new schedule assignment before removing the old table.
alter table public.daily_overrides
  add column if not exists dealership_schedule_id uuid;

alter table public.daily_overrides drop constraint if exists daily_overrides_schedule_user_fk;
alter table public.daily_overrides
  add constraint daily_overrides_schedule_user_fk
  foreign key (dealership_schedule_id, user_id)
  references public.dealership_schedule(id, user_id)
  on delete cascade;

update public.daily_overrides o
set dealership_schedule_id = ds.id
from public.weekly_schedule w
join public.dealerships d
  on d.user_id = w.user_id
 and lower(trim(d.name)) = lower(trim(w.dealership))
join public.dealership_schedule ds
  on ds.user_id = w.user_id
 and ds.dealership_id = d.id
 and ds.weekday = w.weekday
where o.action = 'remove'
  and o.weekly_schedule_id = w.id
  and o.dealership_schedule_id is null;

-- Migrate today's/future recurring route keys so the new UI finds existing entries.
update public.work_entries e
set route_key = 'dealership:' || d.id::text
from public.weekly_schedule w
join public.dealerships d
  on d.user_id = w.user_id
 and lower(trim(d.name)) = lower(trim(w.dealership))
where e.route_key = 'weekly:' || w.id::text;

-- Replace the old override constraint/column.
alter table public.daily_overrides drop constraint if exists daily_overrides_check;
alter table public.daily_overrides drop constraint if exists daily_overrides_action_check;
alter table public.daily_overrides drop column if exists weekly_schedule_id;
alter table public.daily_overrides
  add constraint daily_overrides_action_check check (
    (action='remove' and dealership_schedule_id is not null)
    or
    (action='add' and dealership is not null and rate is not null and rate >= 0)
  );

-- Security for new tables.
alter table public.dealerships enable row level security;
alter table public.dealership_schedule enable row level security;

revoke all on table public.dealerships from anon, authenticated;
revoke all on table public.dealership_schedule from anon, authenticated;
grant select, insert, update, delete on table public.dealerships to authenticated;
grant select, insert, update, delete on table public.dealership_schedule to authenticated;

drop policy if exists "dealership select own" on public.dealerships;
drop policy if exists "dealership insert own" on public.dealerships;
drop policy if exists "dealership update own" on public.dealerships;
drop policy if exists "dealership delete own" on public.dealerships;
create policy "dealership select own" on public.dealerships for select to authenticated using ((select auth.uid()) = user_id);
create policy "dealership insert own" on public.dealerships for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dealership update own" on public.dealerships for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "dealership delete own" on public.dealerships for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "schedule select own" on public.dealership_schedule;
drop policy if exists "schedule insert own" on public.dealership_schedule;
drop policy if exists "schedule update own" on public.dealership_schedule;
drop policy if exists "schedule delete own" on public.dealership_schedule;
create policy "schedule select own" on public.dealership_schedule for select to authenticated using ((select auth.uid()) = user_id);
create policy "schedule insert own" on public.dealership_schedule for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "schedule update own" on public.dealership_schedule for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "schedule delete own" on public.dealership_schedule for delete to authenticated using ((select auth.uid()) = user_id);

-- The old table is no longer used after conversion.
drop table public.weekly_schedule;

commit;
