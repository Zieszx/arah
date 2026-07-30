-- Published national statistics, for CONTEXT only -------------------------
--
-- Figures from the Ministry of Higher Education, held so a page can put our
-- own numbers next to the national picture: "between 20 and 49 of our 207
-- alumni chose this" reads differently beside "1,264,541 students were
-- enrolled nationally". Two different measurements, useful because they
-- differ.
--
-- THIS IS NOT TRAINING DATA, AND CANNOT BECOME IT.
--
-- The model learns from PAIRED records — what one person answered, and which
-- field that same person went on to study. Every row in alumni_profiles is one
-- real individual who supplied both halves. Everything here is an aggregate: a
-- headcount per segment, carrying no information about what any individual
-- answered. There is no way to derive a training row from it, and splitting a
-- national total into plausible-looking individuals would manufacture people
-- who do not exist while making the published accuracy figures describe
-- nothing real.
--
-- Kept in its own table for that reason. ml/train.py reads
-- ml/data/survey.csv and nothing else; a separate table means no query can
-- accidentally union these counts into the corpus. See docs/DATA-SOURCES.md.

create table if not exists public.reference_statistics (
  id          uuid primary key default gen_random_uuid(),
  segment     text        not null,
  level       text        not null,
  -- Every figure is transcribed exactly as published. Nothing here is
  -- derived, interpolated or rounded — a percentage that disagrees with its
  -- own numerator and denominator is how a "context" number quietly becomes
  -- an invented one.
  total_students        integer not null check (total_students >= 0),
  malaysian_students    integer          check (malaysian_students >= 0),
  international_students integer         check (international_students >= 0),
  international_pct     numeric(5,2)     check (international_pct between 0 and 100),
  -- The date the figures describe, not the date they were loaded. A national
  -- statistic without its as-of date is unciteable.
  as_of       date        not null,
  source      text        not null,
  source_url  text,
  created_at  timestamptz not null default now(),
  -- One row per segment/level/date. Re-running the seed updates rather than
  -- duplicating.
  unique (segment, level, as_of)
);

comment on table public.reference_statistics is
  'Published national aggregates for on-screen context. NEVER training data — see docs/DATA-SOURCES.md.';

alter table public.reference_statistics enable row level security;

-- Public, published figures: readable by anyone, exactly as they are on the
-- Ministry''s own site. There is nothing here to protect — no individual is
-- described by any row — so this is the one table in the schema whose read
-- policy is deliberately open.
drop policy if exists "reference statistics are public" on public.reference_statistics;
create policy "reference statistics are public"
  on public.reference_statistics for select using (true);

-- Writes are service-role only. Revoke first: Supabase's default public-schema
-- grants hand `authenticated` full DML on every new table, and a citable
-- statistic that any signed-in account could rewrite is worse than no
-- statistic at all. Same posture as 0004/0005 take on the other tables.
revoke all on public.reference_statistics from anon, authenticated;
grant select on public.reference_statistics to anon, authenticated;
