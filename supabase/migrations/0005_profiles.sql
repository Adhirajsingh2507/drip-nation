-- ============================================================
-- DRIP NATION — 0005 — user profiles
--
-- A queryable profile row per auth user, auto-created from signup metadata
-- (full_name, phone) so the admin panel can list who has registered without
-- touching the auth schema (which isn't exposed via the Data API).
--
-- RLS: a user sees/updates only their own row; admins can read all (for the
-- Users panel). One combined SELECT policy avoids the multiple-permissive
-- overlap. Rows are created by the signup trigger (SECURITY DEFINER) and
-- removed by cascade from auth.users — so there are no client insert/delete
-- policies (fail-closed).
-- ============================================================

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  phone      text not null default '',
  email      text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- (select auth.uid()) so the auth call is evaluated once per query, not per row
create policy profiles_read        on profiles for select using (id = (select auth.uid()) or is_admin());
create policy profiles_self_update on profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Auto-create a profile from the signup metadata (options.data on signUp).
-- SECURITY DEFINER: runs from the auth trigger context and writes past RLS.
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(new.raw_user_meta_data ->> 'phone', ''),
          new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill any users that already exist (none expected yet).
insert into public.profiles (id, full_name, phone, email)
select id,
       coalesce(raw_user_meta_data ->> 'full_name', ''),
       coalesce(raw_user_meta_data ->> 'phone', ''),
       email
from auth.users
on conflict (id) do nothing;

-- Let admins read the full admin roster (for the Users panel role badge).
-- Replace 0004's self-only policy with one combined SELECT policy (self OR admin)
-- so there is still exactly one permissive SELECT policy on admins.
drop policy if exists admins_self_read on admins;
create policy admins_read on admins for select using (id = (select auth.uid()) or is_admin());
