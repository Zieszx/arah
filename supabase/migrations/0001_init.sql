-- ARAH initial schema

create table if not exists alumni_profiles (
  id                  uuid primary key default gen_random_uuid(),
  gender              text,
  spm_year            text,
  state               text,
  school_type         text,
  streams             text[] not null default '{}',
  spm_results         text,
  subjects_enjoyed    text[] not null default '{}',
  subjects_difficult  text[] not null default '{}',
  personality         text,
  tasks_enjoyed       text[] not null default '{}',
  characteristics     text[] not null default '{}',
  public_speaking     int check (public_speaking between 1 and 5),
  preu_program        text,
  field_of_study      text not null,
  reasons             text[] not null default '{}',
  stream_related      boolean,
  satisfaction        int check (satisfaction between 1 and 5),
  advice              text,
  source              text not null default 'survey_2025',
  verified            boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists alumni_field_idx on alumni_profiles (field_of_study);
create index if not exists alumni_verified_idx on alumni_profiles (verified);

create table if not exists profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now()
);

create table if not exists quiz_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  answers     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists quiz_user_idx on quiz_responses (user_id, created_at desc);

create table if not exists predictions (
  id                uuid primary key default gen_random_uuid(),
  quiz_response_id  uuid not null references quiz_responses (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  results           jsonb not null,
  model_version     text not null,
  marginalised      boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists pred_user_idx on predictions (user_id, created_at desc);

create table if not exists fields (
  slug          text primary key,
  name          text not null,
  blurb         text,
  common_preu   text[] not null default '{}'
);

-- Row level security -------------------------------------------------------
alter table profiles        enable row level security;
alter table quiz_responses  enable row level security;
alter table predictions     enable row level security;
alter table alumni_profiles enable row level security;
alter table fields          enable row level security;

-- Note: `create policy` has no `if not exists` in Postgres, so each policy is
-- dropped first to keep this migration safely re-runnable.
drop policy if exists "own profile" on profiles;
create policy "own profile"        on profiles       for all
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own responses" on quiz_responses;
create policy "own responses"      on quiz_responses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own predictions" on predictions;
create policy "own predictions"    on predictions    for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fields are public" on fields;
create policy "fields are public"  on fields         for select using (true);

-- No select policy on alumni_profiles: raw rows are never client-readable.
-- Free-text advice plus rare demographic combinations could re-identify a
-- respondent, so aggregates are exposed through this view instead.
create or replace view field_stats
with (security_invoker = false) as
  select
    field_of_study,
    count(*)::int                       as sample_size,
    round(avg(satisfaction)::numeric, 2) as avg_satisfaction,
    round(
      100.0 * count(*) filter (where satisfaction <= 2) / nullif(count(*), 0), 1
    )                                    as pct_dissatisfied,
    mode() within group (order by preu_program) as common_preu
  from alumni_profiles
  where verified
  group by field_of_study;

grant select on field_stats to anon, authenticated;
