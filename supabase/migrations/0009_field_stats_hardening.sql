-- field_stats hardening: close the temporal-differencing channel --------
--
-- Plan 1's final review found a live re-identification channel in
-- field_stats (0002_field_stats_k_anonymity.sql):
--
--   avg_satisfaction is rounded to 2dp, which at n~17 pins the integer sum
--   exactly. Polling field_stats before and after a single submission
--   yields sum_new - sum_old = that individual's exact satisfaction score,
--   with pct_dissatisfied confirming whether they were <=2. The n>=10
--   threshold does not defend against this -- it only decides whether an
--   aggregate is shown at all, not whether a SINGLE-ROW CHANGE to an
--   already-shown aggregate discloses that row.
--
-- This was not exploitable while alumni_profiles was a static, one-time
-- import: there was never a "before" to diff against a "after". Plan 4
-- Task 4 (/contribute) makes it exploitable -- anyone can submit a
-- contribution, and once an admin verifies it (Plan 5), field_stats moves.
-- This migration MUST ship before Task 4 does.
--
-- Three mitigations, all required together -- each closes a different
-- reduction of the same attack:
--
--   1. avg_satisfaction rounds to 1dp instead of 2dp. Widens the set of
--      possible exact sums consistent with a given displayed average, so a
--      single-row delta no longer pins one value. (On its own this only
--      raises the cost of the attack, not remove it -- hence 2 and 3.)
--
--   2. sample_size is replaced by a banded sample_size_band ('10-19' /
--      '20-49' / '50+') for every UNSUPPRESSED field. The denominator in
--      "sum / n" is exactly what let differencing solve for the exact sum
--      in the first place; hiding n behind a wide band means a one-row
--      change to the true n is never visible at all. Suppressed fields
--      (n<10) keep reporting an EXACT sample_size, unchanged from before --
--      see the header comment on field_stats_cache below for why that
--      half is safe.
--
--   3. The exposed row for a field is a CACHE (field_stats_cache), refreshed
--      by refresh_field_stats_cache() only once at least 3 verified rows
--      have landed for that field since the cache row was last written.
--      This is the mitigation that actually closes the channel: (1) and
--      (2) only widen the attacker's search space, but an attacker who can
--      isolate exactly ONE new verified row between two reads can still
--      brute-force a widened band eventually. Refusing to move the public
--      numbers until 3 rows have landed since the last publish means an
--      attacker can never isolate a single row's contribution -- the
--      smallest visible delta is always a mix of >=3 people.
--
-- FUTURE MAINTAINER WARNING: it will look "obviously fine" to tidy
-- sample_size_band back into an exact integer, or to make the cache
-- refresh on every verified insert "for freshness". Either change silently
-- reopens this channel. Don't, without re-reading this comment and Plan 1's
-- review in full.
--
-- Idempotent: every statement below is safe to run twice (create table/
-- function/view use IF NOT EXISTS / OR REPLACE; the trigger is dropped
-- before being recreated; the one-time backfill call is itself gated by
-- the same 3-row rule, so a second run of this file is a no-op there too).

-- field_stats_cache -----------------------------------------------------
-- Internal state, never selected by anon/authenticated directly (see the
-- revoke below) -- only field_stats, the public view built on top of it,
-- is granted. verified_count_at_refresh is the exact verified row count
-- AS OF THE LAST PUBLISH -- itself never exposed -- used purely to decide
-- when the next publish is allowed.
create table if not exists field_stats_cache (
  field_of_study            text primary key,
  verified_count_at_refresh int not null,
  suppressed                boolean not null,
  -- Exact, populated only when suppressed (n<10) -- see mitigation 2 above.
  sample_size               int,
  -- '10-19' | '20-49' | '50+', populated only when NOT suppressed.
  sample_size_band          text,
  avg_satisfaction          numeric(3, 1),
  pct_dissatisfied          numeric(4, 1),
  common_preu               text,
  updated_at                timestamptz not null default now()
);

revoke all on field_stats_cache from anon, authenticated;

-- refresh_field_stats_cache ----------------------------------------------
-- Recomputes and publishes field_of_study's row, but ONLY if this is the
-- very first publish for that field (no cache row yet -- safe: an initial
-- publish is not a "delta" an attacker can diff against a prior public
-- value, they have no prior baseline) or at least 3 verified rows have
-- landed since the row currently in the cache was written (mitigation 3).
-- security definer + explicit search_path so it can read alumni_profiles
-- (which grants nothing to anon/authenticated -- 0004) the same way the
-- k-anonymised views already do via security_invoker=false.
create or replace function refresh_field_stats_cache(p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_count int;
  v_last_count     int;
begin
  select count(*) into v_current_count
  from alumni_profiles
  where verified and field_of_study = p_field;

  select verified_count_at_refresh into v_last_count
  from field_stats_cache
  where field_of_study = p_field;

  -- The gate. v_last_count is null on a field's first-ever publish, which
  -- always proceeds (see comment above). Otherwise: refuse to move the
  -- public numbers for fewer than 3 rows of change, in either direction.
  if v_last_count is not null and abs(v_current_count - v_last_count) < 3 then
    return;
  end if;

  insert into field_stats_cache (
    field_of_study, verified_count_at_refresh, suppressed,
    sample_size, sample_size_band,
    avg_satisfaction, pct_dissatisfied, common_preu, updated_at
  )
  select
    p_field,
    v_current_count,
    v_current_count < 10,
    case when v_current_count < 10 then v_current_count else null end,
    case
      when v_current_count >= 50 then '50+'
      when v_current_count >= 20 then '20-49'
      when v_current_count >= 10 then '10-19'
      else null
    end,
    case when v_current_count >= 10
      then round(avg(satisfaction)::numeric, 1) else null end,
    case when v_current_count >= 10
      then round(
        100.0 * count(*) filter (where satisfaction <= 2) / nullif(count(*), 0), 1
      )
      else null end,
    case when v_current_count >= 10
      then mode() within group (order by preu_program) else null end,
    now()
  from alumni_profiles
  where verified and field_of_study = p_field
  on conflict (field_of_study) do update set
    verified_count_at_refresh = excluded.verified_count_at_refresh,
    suppressed                = excluded.suppressed,
    sample_size               = excluded.sample_size,
    sample_size_band          = excluded.sample_size_band,
    avg_satisfaction          = excluded.avg_satisfaction,
    pct_dissatisfied          = excluded.pct_dissatisfied,
    common_preu               = excluded.common_preu,
    updated_at                = now();
end;
$$;

revoke all on function refresh_field_stats_cache(text) from public, anon, authenticated;

-- Trigger: fires whenever a row becomes verified (fresh insert already
-- verified=true, e.g. the survey import/seed script, or a future admin
-- approval flipping verified false->true, Plan 5). Each firing calls the
-- gated function above, so most firings are no-ops until the 3-row bar is
-- met -- the gate lives in the function, not here, so any future direct
-- caller of refresh_field_stats_cache() inherits the same protection.
create or replace function trg_field_stats_refresh() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform refresh_field_stats_cache(NEW.field_of_study);
  return NEW;
end;
$$;

drop trigger if exists field_stats_refresh_on_verify on alumni_profiles;
create trigger field_stats_refresh_on_verify
  after insert or update of verified, field_of_study on alumni_profiles
  for each row
  when (NEW.verified)
  execute function trg_field_stats_refresh();

-- One-time backfill: publish every field that already has verified rows.
-- Safe to run on every re-application of this migration -- each call is
-- independently gated by refresh_field_stats_cache's own 3-row rule, so
-- once a field's cache row exists this becomes a no-op until 3 more rows
-- land, exactly like the trigger path.
do $$
declare
  f text;
begin
  for f in select distinct field_of_study from alumni_profiles where verified loop
    perform refresh_field_stats_cache(f);
  end loop;
end;
$$;

-- field_stats -------------------------------------------------------------
-- The public view. Same name and same column set as before for
-- avg_satisfaction/pct_dissatisfied/common_preu/suppressed/field_of_study
-- so every existing anon/authenticated caller keeps working; sample_size
-- is now exact-only-when-suppressed and sample_size_band is new (see the
-- header comment). Every JS consumer of this shape is updated in the same
-- commit as this migration -- see lib/explore/sampleSize.js.
--
-- Dropped and recreated rather than `create or replace`: Postgres refuses
-- `or replace` when a view's column list changes shape (adding
-- sample_size_band shifts the position of every column after
-- sample_size), so this must be a genuine drop. Nothing else in the
-- schema references field_stats by foreign key or view dependency --
-- field_detail_stats and advice_quotes (0007/0008) both read
-- alumni_profiles directly -- so the drop is safe. Both statements are
-- idempotent (drop ... if exists; create, unconditionally, right after).
drop view if exists field_stats;
create view field_stats
with (security_invoker = false) as
  select
    field_of_study,
    sample_size,
    sample_size_band,
    avg_satisfaction,
    pct_dissatisfied,
    common_preu,
    suppressed
  from field_stats_cache;

-- Same hardening pattern as 0003/0007/0008: REVOKE ALL before GRANT
-- SELECT. field_stats is a plain single-table select with no aggregation
-- (unlike the old field_stats, which aggregated alumni_profiles directly
-- and was therefore not auto-updatable) -- combined with
-- security_invoker=false this view IS the auto-updatable shape Postgres
-- would otherwise let anon/authenticated write straight through into
-- field_stats_cache. Revoke first so Supabase's default public-schema
-- grants can never leave that door open.
revoke all on field_stats from anon, authenticated;
grant select on field_stats to anon, authenticated;
