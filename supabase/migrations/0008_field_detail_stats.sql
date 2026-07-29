-- field_detail_stats: per-field aggregates for /explore/[field] --------------
--
-- field_stats (0002/0003) already gives the index page what it needs
-- (sample_size, avg_satisfaction, pct_dissatisfied, common_preu, suppressed).
-- The detail page needs three more shapes field_stats does not provide: the
-- full 1-5 satisfaction distribution (for the Recharts bar chart), the full
-- pre-U route breakdown (not just the mode), and the SPM stream breakdown
-- (streams is a text[] -- a multi-select column -- so it needs unnest before
-- it can be grouped, which a single flat GROUP BY cannot express alongside
-- the other two shapes). One view, one round trip, rather than querying
-- alumni_profiles directly from the app (alumni_profiles has no select
-- policy at all -- 0001_init.sql -- and 0004 additionally revokes every
-- table privilege from anon/authenticated as defence in depth; field_stats
-- and this view are the only sanctioned paths out of that table).
--
-- Built as CTEs rather than correlated subqueries in the SELECT list: each
-- shape (satisfaction, preu, streams) is grouped down to one row per field
-- independently, then left-joined back onto the base sample-size count. This
-- reads the same as three small, separately-testable aggregate queries
-- rather than one dense correlated one.
--
-- Suppression matches field_stats exactly: same n>=10 threshold, same
-- "sample_size is always safe to show, the derived per-person aggregates are
-- not" reasoning (see 0002's comment). Below the threshold every distribution
-- column is null -- never an empty object, which could be mistaken by a
-- caller for "zero respondents chose any option" rather than "withheld".
create or replace view field_detail_stats
with (security_invoker = false) as
  with base as (
    select field_of_study, satisfaction, preu_program, streams
    from alumni_profiles
    where verified
  ),
  counts as (
    select field_of_study, count(*)::int as sample_size
    from base
    group by field_of_study
  ),
  satisfaction as (
    select field_of_study, jsonb_object_agg(satisfaction::text, cnt) as distribution
    from (
      select field_of_study, satisfaction, count(*) as cnt
      from base
      where satisfaction is not null
      group by field_of_study, satisfaction
    ) s
    group by field_of_study
  ),
  preu as (
    select field_of_study, jsonb_object_agg(preu_program, cnt) as distribution
    from (
      select field_of_study, preu_program, count(*) as cnt
      from base
      where preu_program is not null and preu_program <> ''
      group by field_of_study, preu_program
    ) p
    group by field_of_study
  ),
  streams as (
    select field_of_study, jsonb_object_agg(stream, cnt) as distribution
    from (
      select field_of_study, unnest(streams) as stream, count(*) as cnt
      from base
      group by field_of_study, stream
    ) st
    group by field_of_study
  )
  select
    c.field_of_study,
    c.sample_size,
    c.sample_size < 10 as suppressed,
    case when c.sample_size >= 10 then satisfaction.distribution else null end
      as satisfaction_distribution,
    case when c.sample_size >= 10 then preu.distribution else null end
      as preu_distribution,
    case when c.sample_size >= 10 then streams.distribution else null end
      as stream_distribution
  from counts c
  left join satisfaction on satisfaction.field_of_study = c.field_of_study
  left join preu          on preu.field_of_study          = c.field_of_study
  left join streams        on streams.field_of_study        = c.field_of_study;

-- Same hardening pattern as 0003 (field_stats) and 0007 (advice_quotes),
-- applied here as policy regardless of whether this particular view is
-- exploitable: this one is a multi-CTE aggregate (like field_stats), so it
-- is not auto-updatable either -- but the whole point of "revoke first" is
-- to not have to re-derive that judgment call by hand for every new view.
-- Supabase's default public-schema grants hand anon/authenticated DML on
-- anything created in public; revoke it explicitly rather than rely on this
-- view's shape staying non-updatable forever.
revoke all on field_detail_stats from anon, authenticated;
grant select on field_detail_stats to anon, authenticated;
