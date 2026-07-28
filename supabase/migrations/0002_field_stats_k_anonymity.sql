-- field_stats k-anonymity threshold ----------------------------------------
--
-- field_stats is the only sanctioned path to alumni_profiles data: the base
-- table has no select policy, so this view stands between 207 real students
-- and anyone who queries the database. At small sample sizes its per-person
-- aggregates edge toward re-identifying an individual respondent -- e.g.
-- Humanities & Social Sciences (n=7) and Creative Art (n=9) are small enough
-- that avg_satisfaction, pct_dissatisfied, and especially
-- mode() within group (order by preu_program) (a bare plurality of 2 people
-- at n=7) could let someone who knows one respondent infer their answers.
--
-- field_of_study and sample_size are always returned -- a bare count is not
-- disclosive, and the product deliberately surfaces "only 9 students in our
-- data chose this" as an honesty signal on low-confidence results. Only the
-- derived per-person statistics are suppressed below the threshold.
create or replace view field_stats
with (security_invoker = false) as
  select
    field_of_study,
    count(*)::int as sample_size,
    case when count(*) >= 10
      then round(avg(satisfaction)::numeric, 2)
      else null
    end as avg_satisfaction,
    case when count(*) >= 10
      then round(
        100.0 * count(*) filter (where satisfaction <= 2) / nullif(count(*), 0), 1
      )
      else null
    end as pct_dissatisfied,
    case when count(*) >= 10
      then mode() within group (order by preu_program)
      else null
    end as common_preu,
    count(*) < 10 as suppressed
  from alumni_profiles
  where verified
  group by field_of_study;

grant select on field_stats to anon, authenticated;
