-- Add the admin flag: grant-only, never self-service ------------------------

alter table profiles add column if not exists is_admin boolean not null default false;

-- Defence in depth against escalation: RLS's "own profile" policy (0001_init.sql)
-- is `for all` and only checks row ownership (auth.uid() = id) -- it does not
-- restrict which columns get written. Supabase's default public-schema grants
-- additionally hand `authenticated` full column-level DML on every table (see
-- 0003_tighten_field_stats_grants.sql). Combined, a compromised or merely
-- buggy client could otherwise run `update profiles set is_admin = true`
-- against its own row and have RLS wave it through.
--
-- Column-level privileges close this regardless of RLS or future application
-- bugs: `authenticated` may only write display_name (update) and id,
-- display_name (insert -- the initial profile row created at signup). Because
-- is_admin is left off both column lists, no INSERT or UPDATE issued by an
-- authenticated client can ever set it, no matter what the client sends or
-- how RLS evaluates. Only the service role (which bypasses column grants and
-- RLS alike) can flip it -- see scripts/set-admin.mjs.
revoke insert, update on profiles from authenticated;
grant insert (id, display_name) on profiles to authenticated;
grant update (display_name) on profiles to authenticated;

-- is_admin() reads profiles from inside RLS policies on other tables
-- (quiz_responses, predictions below), so it must run as security definer:
-- the invoking role (anon/authenticated) has no SELECT access to rows other
-- than its own via RLS, and a non-definer function would only ever be able
-- to see the caller's own row anyway, which is what we want here -- but
-- definer rights also let it evaluate reliably regardless of the caller's
-- own row-level grants. `stable` lets the planner cache the result within a
-- single statement. `search_path` is pinned to defend a SECURITY DEFINER
-- function against search_path hijacking.
create or replace function is_admin() returns boolean
language sql security definer stable
set search_path = public, pg_temp
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Admins may read every quiz response and prediction, for support. Additive
-- only: the existing "own responses" / "own predictions" `for all` policies
-- (0001_init.sql) are untouched and still apply. Postgres OR-combines
-- multiple permissive policies for the same command, so this only adds a
-- second, SELECT-only avenue for admins -- it cannot narrow what a student
-- can already see, and a student who is not an admin gets is_admin() = false
-- so this policy contributes nothing to their access.
drop policy if exists "admins read responses" on quiz_responses;
create policy "admins read responses" on quiz_responses for select using (is_admin());
drop policy if exists "admins read predictions" on predictions;
create policy "admins read predictions" on predictions for select using (is_admin());
