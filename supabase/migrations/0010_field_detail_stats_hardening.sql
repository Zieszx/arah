-- field_detail_stats hardening: close the same channel, worse in kind ----
--
-- Found live, after 0009 and Task 4 (/contribute) both shipped:
-- field_detail_stats (0008_field_detail_stats.sql) publishes EXACT
-- per-category counts --
--
--   {"field_of_study":"Media & Communication","sample_size":18,
--    "suppressed":false,"satisfaction_distribution":{"4":7,"5":11}, ...}
--
-- This is WORSE than pre-0009 field_stats was, not just an overlooked
-- twin of it. field_stats only ever leaked a SUM across however many rows
-- changed -- recovering one respondent's exact score required exactly one
-- row to have changed between two reads, and the arithmetic (sum_new -
-- sum_old) still had to be done. field_detail_stats' histogram needs no
-- arithmetic at all: poll before/after one approval, see {"4":7} become
-- {"4":8}, and that IS the changed respondent's exact satisfaction score,
-- read directly off the map. Worse still, this survives 0009's 3-row gate
-- better than field_stats does: when 3 new verified rows land at once,
-- field_stats only ever discloses their undifferentiated SUM (which of
-- the 3 contributed what stays unknown), but an unbanded histogram can
-- disclose exactly how those 3 rows split across categories -- e.g. going
-- from {"4":7,"5":11} to {"3":1,"4":8,"5":12} says, with certainty, one of
-- the three was a 3, one a 4, one a 5. Same channel, same trigger
-- (Task 4 gives anyone a write path), but the histogram shape makes it
-- worse per row, not just as leaky.
--
-- Same three mitigations as 0009, adapted to distributions:
--
--   1. REUSE 0009's gate -- do not build a second one.
--      refresh_field_stats_cache() (0009) is extended in place (this file
--      does `create or replace function` on the SAME name/signature) to
--      also compute and publish field_detail_stats_cache, inside the SAME
--      function call, behind the SAME "no prior row, or >=3 verified rows
--      changed since the last publish" check field_stats_cache already
--      uses. A second, independent gate for field_detail_stats would
--      itself be a differencing channel -- an attacker could compare
--      whether field_stats moved without field_detail_stats moving (or
--      vice versa) and infer something about exactly when a row landed.
--      Sharing one gate means the two views can only ever publish in
--      lockstep, from one decision, at one timestamp.
--
--   2. Distribution counts become PERCENTAGES of that distribution's own
--      total, rounded to the nearest 5, with a 5 floor for any category
--      that has at least one respondent (band_pct() below). A real,
--      present category must never render as 0% -- that reads as "nobody
--      chose this", the exact kind of fabricated absence 0002/0008
--      already forbid for the top-level aggregates. The EXACT integer
--      counts are computed only inside refresh_field_stats_cache(), in
--      the same transaction as everything else, and are never stored or
--      exposed anywhere -- field_detail_stats_cache only ever holds the
--      rounded percentage. This is, on its own, only a widening (like
--      0009's 1dp rounding) -- mitigation 1 is what actually closes the
--      channel, by making sure a within-band change is never attributable
--      to fewer than 3 people at once either.
--
--   3. field_detail_stats no longer computes sample_size/suppressed
--      independently -- it now JOINS field_stats_cache and republishes
--      the exact same sample_size/sample_size_band/suppressed 0009
--      already hardened, so the two views can never disagree about how
--      large or how current a field's sample is. Before this, field_stats
--      could report a field as (say) '10-19' while field_detail_stats
--      still reported an exact sample_size for the SAME field -- reading
--      the "hidden" exact count back out through the second view. That
--      was the original review's complaint about field_stats' 0002-era
--      shape, reopened here by 0008 predating 0009's fix.
--
-- FUTURE MAINTAINER WARNING: it will look "obviously fine" to give
-- field_detail_stats its own refresh cadence "for freshness", or to tidy
-- the percentages back into exact counts "for a nicer chart". Either
-- change silently reopens this channel. Don't, without re-reading this
-- comment, 0009's, and Plan 1's review in full.
--
-- Idempotent: create-or-replace / create-table-if-not-exists /
-- drop-view-if-exists throughout; the backfill loop is gated exactly like
-- 0009's, safe to run twice.

-- band_pct ------------------------------------------------------------
-- Nearest-5 percentage of p_count/p_total, floored at 5 for any nonzero
-- count (see mitigation 2). Pure/immutable: no table access, so it needs
-- no special privilege handling beyond the blanket revoke below.
create or replace function band_pct(p_count int, p_total int)
returns int
language sql
immutable
as $$
  select case
    when p_total is null or p_total <= 0 or p_count is null or p_count <= 0 then null
    else greatest(5, (round((100.0 * p_count / p_total) / 5.0) * 5)::int)
  end;
$$;

revoke all on function band_pct(int, int) from public, anon, authenticated;

-- field_detail_stats_cache ----------------------------------------------
-- Internal state, same pattern as field_stats_cache (0009): never
-- selected by anon/authenticated directly, only through the
-- field_detail_stats view built on top of it. Holds banded PERCENTAGES
-- only -- never the exact counts refresh_field_stats_cache() computes
-- them from.
create table if not exists field_detail_stats_cache (
  field_of_study             text primary key,
  satisfaction_distribution  jsonb,
  preu_distribution          jsonb,
  stream_distribution        jsonb,
  updated_at                 timestamptz not null default now()
);

revoke all on field_detail_stats_cache from anon, authenticated;

-- refresh_field_stats_cache -----------------------------------------------
-- Same signature and same gate as 0009's version -- this is a
-- `create or replace`, not a new function, specifically so field_stats
-- and field_detail_stats can never publish on different schedules
-- (mitigation 1). The only change from 0009's body is the new
-- field_detail_stats_cache upsert appended after the existing
-- field_stats_cache one, and one extra escape hatch in the gate: a field
-- with no field_detail_stats_cache row yet (true exactly once, the first
-- time this migration runs per field) always proceeds, for the same
-- "no prior baseline to diff against" reason 0009's v_last_count IS NULL
-- case does. Without that escape hatch, every field already has a
-- field_stats_cache row from 0009 with verified_count_at_refresh matching
-- the live count exactly (delta 0 < 3), so field_detail_stats_cache would
-- never get its first row at all.
create or replace function refresh_field_stats_cache(p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_count int;
  v_last_count     int;
  v_has_detail     boolean;
begin
  select count(*) into v_current_count
  from alumni_profiles
  where verified and field_of_study = p_field;

  select verified_count_at_refresh into v_last_count
  from field_stats_cache
  where field_of_study = p_field;

  select exists(
    select 1 from field_detail_stats_cache where field_of_study = p_field
  ) into v_has_detail;

  if v_last_count is not null
     and v_has_detail
     and abs(v_current_count - v_last_count) < 3
  then
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

  -- 0010: the distributions, banded, published in the same gated call.
  -- Built as CTEs (same style as 0008) rather than correlated subqueries:
  -- each shape (satisfaction, preu, streams) reduces to its own count+total
  -- independently, then band_pct() converts count/total to a percentage
  -- only at the very end, right before it is written to the cache.
  with base as (
    select satisfaction, preu_program, streams
    from alumni_profiles
    where verified and field_of_study = p_field
  ),
  sat_counts as (
    select satisfaction, count(*)::int as cnt
    from base
    where satisfaction is not null
    group by satisfaction
  ),
  sat_total as (
    select coalesce(sum(cnt), 0)::int as total from sat_counts
  ),
  sat_json as (
    select jsonb_object_agg(
      satisfaction::text, band_pct(cnt, (select total from sat_total))
    ) as distribution
    from sat_counts
  ),
  preu_counts as (
    select preu_program, count(*)::int as cnt
    from base
    where preu_program is not null and preu_program <> ''
    group by preu_program
  ),
  preu_total as (
    select coalesce(sum(cnt), 0)::int as total from preu_counts
  ),
  preu_json as (
    select jsonb_object_agg(
      preu_program, band_pct(cnt, (select total from preu_total))
    ) as distribution
    from preu_counts
  ),
  stream_counts as (
    select stream, count(*)::int as cnt
    from (select unnest(streams) as stream from base) u
    group by stream
  ),
  stream_total as (
    select coalesce(sum(cnt), 0)::int as total from stream_counts
  ),
  stream_json as (
    select jsonb_object_agg(
      stream, band_pct(cnt, (select total from stream_total))
    ) as distribution
    from stream_counts
  )
  insert into field_detail_stats_cache (
    field_of_study, satisfaction_distribution, preu_distribution,
    stream_distribution, updated_at
  )
  select
    p_field,
    case when v_current_count >= 10 then (select distribution from sat_json) else null end,
    case when v_current_count >= 10 then (select distribution from preu_json) else null end,
    case when v_current_count >= 10 then (select distribution from stream_json) else null end,
    now()
  on conflict (field_of_study) do update set
    satisfaction_distribution = excluded.satisfaction_distribution,
    preu_distribution         = excluded.preu_distribution,
    stream_distribution       = excluded.stream_distribution,
    updated_at                = now();
end;
$$;

revoke all on function refresh_field_stats_cache(text) from public, anon, authenticated;

-- One-time backfill, same pattern as 0009's. On a fresh run of this
-- migration every field hits the v_has_detail escape hatch above (no
-- field_detail_stats_cache row exists yet), so this actually populates
-- the new cache once; a second run of this file finds every field already
-- has a detail row and the count unchanged, so it is a genuine no-op.
do $$
declare
  f text;
begin
  for f in select distinct field_of_study from alumni_profiles where verified loop
    perform refresh_field_stats_cache(f);
  end loop;
end;
$$;

-- field_detail_stats -------------------------------------------------------
-- Dropped and recreated (not `create or replace`): the column list and
-- source both change shape (sample_size/suppressed now come from a join
-- onto field_stats_cache instead of being computed here, and the three
-- distribution columns are now percentages, not counts). Nothing else in
-- the schema references field_detail_stats by foreign key or view
-- dependency, so the drop is safe.
--
-- Left join, not inner: a field could in principle have a field_stats_cache
-- row (from 0009) without a field_detail_stats_cache row (impossible after
-- this migration's backfill runs, but the join stays defensive rather than
-- silently dropping a field from the view if that invariant is ever
-- violated by a future change).
drop view if exists field_detail_stats;
create view field_detail_stats
with (security_invoker = false) as
  select
    c.field_of_study,
    c.sample_size,
    c.sample_size_band,
    c.suppressed,
    d.satisfaction_distribution,
    d.preu_distribution,
    d.stream_distribution
  from field_stats_cache c
  left join field_detail_stats_cache d on d.field_of_study = c.field_of_study;

-- Same hardening pattern as 0003/0007/0008/0009: REVOKE ALL before GRANT
-- SELECT, regardless of whether this particular join happens to be
-- auto-updatable (a view with a JOIN never is, per Postgres's own rules --
-- but per 0008's original comment, the point of revoking first is to not
-- have to re-derive that judgement call by hand for every new view).
revoke all on field_detail_stats from anon, authenticated;
grant select on field_detail_stats to anon, authenticated;
