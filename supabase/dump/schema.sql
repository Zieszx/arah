--
-- PostgreSQL database dump
--

\restrict sppkB0IhqbrAJS9Zd5fcGieUFW1GidIW3qWUp1bru6eb6dhCJGCrQw2DVaw7g7Q

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: band_pct(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.band_pct(p_count integer, p_total integer) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  select case
    when p_total is null or p_total <= 0 or p_count is null or p_count <= 0 then null
    else greatest(5, (round((100.0 * p_count / p_total) / 5.0) * 5)::int)
  end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;


--
-- Name: refresh_field_stats_cache(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_field_stats_cache(p_field text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- Name: trg_field_stats_refresh(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_field_stats_refresh() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform refresh_field_stats_cache(NEW.field_of_study);
  return NEW;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alumni_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alumni_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gender text,
    spm_year text,
    state text,
    school_type text,
    streams text[] DEFAULT '{}'::text[] NOT NULL,
    spm_results text,
    subjects_enjoyed text[] DEFAULT '{}'::text[] NOT NULL,
    subjects_difficult text[] DEFAULT '{}'::text[] NOT NULL,
    personality text,
    tasks_enjoyed text[] DEFAULT '{}'::text[] NOT NULL,
    characteristics text[] DEFAULT '{}'::text[] NOT NULL,
    public_speaking integer,
    preu_program text,
    field_of_study text NOT NULL,
    reasons text[] DEFAULT '{}'::text[] NOT NULL,
    stream_related boolean,
    satisfaction integer,
    advice text,
    source text DEFAULT 'survey_2025'::text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    rejected_at timestamp with time zone,
    rejected_by uuid,
    CONSTRAINT alumni_profiles_public_speaking_check CHECK (((public_speaking >= 1) AND (public_speaking <= 5))),
    CONSTRAINT alumni_profiles_satisfaction_check CHECK (((satisfaction >= 1) AND (satisfaction <= 5)))
);


--
-- Name: advice_quotes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.advice_quotes WITH (security_invoker='false') AS
 SELECT advice
   FROM public.alumni_profiles
  WHERE (verified AND (advice IS NOT NULL) AND ((char_length(advice) >= 45) AND (char_length(advice) <= 220)));


--
-- Name: field_detail_stats_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_detail_stats_cache (
    field_of_study text NOT NULL,
    satisfaction_distribution jsonb,
    preu_distribution jsonb,
    stream_distribution jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: field_stats_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_stats_cache (
    field_of_study text NOT NULL,
    verified_count_at_refresh integer NOT NULL,
    suppressed boolean NOT NULL,
    sample_size integer,
    sample_size_band text,
    avg_satisfaction numeric(3,1),
    pct_dissatisfied numeric(4,1),
    common_preu text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: field_detail_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.field_detail_stats WITH (security_invoker='false') AS
 SELECT c.field_of_study,
    c.sample_size,
    c.sample_size_band,
    c.suppressed,
    d.satisfaction_distribution,
    d.preu_distribution,
    d.stream_distribution
   FROM (public.field_stats_cache c
     LEFT JOIN public.field_detail_stats_cache d ON ((d.field_of_study = c.field_of_study)));


--
-- Name: field_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.field_stats WITH (security_invoker='false') AS
 SELECT field_of_study,
    sample_size,
    sample_size_band,
    avg_satisfaction,
    pct_dissatisfied,
    common_preu,
    suppressed
   FROM public.field_stats_cache;


--
-- Name: fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fields (
    slug text NOT NULL,
    name text NOT NULL,
    blurb text,
    common_preu text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_response_id uuid NOT NULL,
    user_id uuid NOT NULL,
    results jsonb NOT NULL,
    model_version text NOT NULL,
    marginalised boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_admin boolean DEFAULT false NOT NULL
);


--
-- Name: quiz_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    answers jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: reference_statistics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reference_statistics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    segment text NOT NULL,
    level text NOT NULL,
    total_students integer NOT NULL,
    malaysian_students integer,
    international_students integer,
    international_pct numeric(5,2),
    as_of date NOT NULL,
    source text NOT NULL,
    source_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reference_statistics_international_pct_check CHECK (((international_pct >= (0)::numeric) AND (international_pct <= (100)::numeric))),
    CONSTRAINT reference_statistics_international_students_check CHECK ((international_students >= 0)),
    CONSTRAINT reference_statistics_malaysian_students_check CHECK ((malaysian_students >= 0)),
    CONSTRAINT reference_statistics_total_students_check CHECK ((total_students >= 0))
);


--
-- Name: TABLE reference_statistics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.reference_statistics IS 'Published national aggregates for on-screen context. NEVER training data — see docs/DATA-SOURCES.md.';


--
-- Name: alumni_profiles alumni_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_pkey PRIMARY KEY (id);


--
-- Name: field_detail_stats_cache field_detail_stats_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_detail_stats_cache
    ADD CONSTRAINT field_detail_stats_cache_pkey PRIMARY KEY (field_of_study);


--
-- Name: field_stats_cache field_stats_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_stats_cache
    ADD CONSTRAINT field_stats_cache_pkey PRIMARY KEY (field_of_study);


--
-- Name: fields fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY (slug);


--
-- Name: predictions predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quiz_responses quiz_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_responses
    ADD CONSTRAINT quiz_responses_pkey PRIMARY KEY (id);


--
-- Name: reference_statistics reference_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_statistics
    ADD CONSTRAINT reference_statistics_pkey PRIMARY KEY (id);


--
-- Name: reference_statistics reference_statistics_segment_level_as_of_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reference_statistics
    ADD CONSTRAINT reference_statistics_segment_level_as_of_key UNIQUE (segment, level, as_of);


--
-- Name: alumni_field_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alumni_field_idx ON public.alumni_profiles USING btree (field_of_study);


--
-- Name: alumni_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alumni_pending_idx ON public.alumni_profiles USING btree (created_at) WHERE ((NOT verified) AND (rejected_at IS NULL));


--
-- Name: alumni_verified_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX alumni_verified_idx ON public.alumni_profiles USING btree (verified);


--
-- Name: pred_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pred_user_idx ON public.predictions USING btree (user_id, created_at DESC);


--
-- Name: quiz_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quiz_user_idx ON public.quiz_responses USING btree (user_id, created_at DESC);


--
-- Name: alumni_profiles field_stats_refresh_on_verify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER field_stats_refresh_on_verify AFTER INSERT OR UPDATE OF verified, field_of_study ON public.alumni_profiles FOR EACH ROW WHEN (new.verified) EXECUTE FUNCTION public.trg_field_stats_refresh();


--
-- Name: alumni_profiles alumni_profiles_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: alumni_profiles alumni_profiles_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alumni_profiles
    ADD CONSTRAINT alumni_profiles_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: predictions predictions_quiz_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_quiz_response_id_fkey FOREIGN KEY (quiz_response_id) REFERENCES public.quiz_responses(id) ON DELETE CASCADE;


--
-- Name: predictions predictions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_responses quiz_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_responses
    ADD CONSTRAINT quiz_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: predictions admins read predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins read predictions" ON public.predictions FOR SELECT USING (public.is_admin());


--
-- Name: quiz_responses admins read responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins read responses" ON public.quiz_responses FOR SELECT USING (public.is_admin());


--
-- Name: alumni_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;

--
-- Name: fields fields are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "fields are public" ON public.fields FOR SELECT USING (true);


--
-- Name: predictions own predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own predictions" ON public.predictions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own profile" ON public.profiles USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: quiz_responses own responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own responses" ON public.quiz_responses USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: reference_statistics reference statistics are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "reference statistics are public" ON public.reference_statistics FOR SELECT USING (true);


--
-- Name: reference_statistics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reference_statistics ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict sppkB0IhqbrAJS9Zd5fcGieUFW1GidIW3qWUp1bru6eb6dhCJGCrQw2DVaw7g7Q

