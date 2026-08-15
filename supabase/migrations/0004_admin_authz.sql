-- ============================================================
-- DRIP NATION — 0004 — admin authorization model
--
-- Authentication (who) is handled by Supabase Auth (Google OAuth).
-- Authorization (admin or not) is decided HERE: a user is an admin iff their
-- auth.uid() is present in public.admins. This is provider-agnostic — it works
-- the same whether login is Google, email/password, or anything else.
--
-- is_admin() (already used by every catalog/orders RLS policy) is rewritten to
-- consult this table instead of a JWT claim. It stays SECURITY INVOKER: the
-- admins_self_read policy lets a caller see *their own* admins row, so the
-- EXISTS resolves correctly without SECURITY DEFINER (anon/non-admins simply
-- match no row → false).
--
-- Bootstrapping an admin: the user must sign in once (creating their
-- auth.users row), then insert that id into public.admins (server-side / SQL).
-- There are deliberately NO insert/update/delete policies on admins, so the
-- table is fail-closed — only the service role / trusted SQL can grant admin.
-- ============================================================

create table admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  note       text default '',
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- A signed-in user may read only their own row (used by the admin UI to decide
-- whether to show the panel). No one can see the full admin roster via the API.
create policy admins_self_read on admins for select using (id = auth.uid());

-- Rewrite is_admin(): membership in admins, keyed by the caller's auth.uid().
create or replace function is_admin() returns boolean
  language sql stable set search_path = '' as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$;
