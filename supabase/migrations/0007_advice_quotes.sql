-- advice_quotes: the only client-readable window into alumni_profiles' free
-- text advice, built for the /signup ↔ /login sliding panel
-- (docs/design/visual-design-system.md §5c).
--
-- alumni_profiles has no select policy at all (0001_init.sql), and
-- 0004_tighten_alumni_grants.sql additionally revokes every table privilege
-- from anon/authenticated as defence in depth. This view is therefore the
-- *only* sanctioned path from that table to a browser, and it is
-- deliberately narrow: it returns the advice text and nothing else -- no
-- field_of_study, no demographics, no satisfaction score, no id. A quote on
-- its own is not identifying; a quote attributed to a field with n=7
-- students is. Never join this view's output back to any other
-- alumni_profiles column for this panel, no matter how convenient.
--
-- Length filter: 45-220 characters. Below 45 the free text tends to be a
-- fragment ("choose wisely") too thin to read as real advice on the panel;
-- above 220 it overflows the panel's fixed footprint. 68 of 207 rows
-- qualify (verified, at the time this migration was written).
create or replace view advice_quotes
with (security_invoker = false) as
  select advice
  from alumni_profiles
  where verified
    and advice is not null
    and char_length(advice) between 45 and 220;

-- Unlike field_stats (an aggregate, therefore not auto-updatable), this view
-- selects a single column straight off one table with no aggregation --
-- exactly the shape Postgres treats as auto-updatable. Combined with
-- security_invoker = false (it runs as the view owner, the same mechanism
-- that lets it read past RLS), a stray INSERT/UPDATE/DELETE grant here would
-- let anon/authenticated write into alumni_profiles.advice through the view,
-- even though the base table itself grants them nothing (0004). Revoke first
-- so Supabase's default public-schema DML grants can't linger, matching the
-- same defence-in-depth pattern as 0003_tighten_field_stats_grants.sql.
revoke all on advice_quotes from anon, authenticated;
grant select on advice_quotes to anon, authenticated;
