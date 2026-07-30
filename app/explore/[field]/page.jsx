// /explore/[field] — one field's profile (Plan 4, Task 3). Server Component
// throughout, except the satisfaction chart (code-split, see
// SatisfactionChartLoader.jsx).
//
// Routing: `generateStaticParams` below returns the ten known slugs from
// lib/explore/fields.js (the single source for the field<->slug mapping),
// and `dynamicParams = false` makes any other slug a genuine 404 rather
// than a dynamically-rendered guess (node_modules/next/dist/docs/01-app/
// 03-api-reference/03-file-conventions/02-route-segment-config/dynamicParams.md).
// `params` is a Promise in Next.js 16 and must be awaited
// (.../03-file-conventions/dynamic-routes.md).
//
// Honesty, carried from /results and the /explore index: a suppressed
// field (n<10 — Creative Art 9, Humanities & Social Sciences 7) renders
// its sample size and a plain sentence explaining why nothing else is
// shown. No chart, no route/stream breakdown, no quotes are even fetched
// for a suppressed field, let alone rendered — this is a structural
// omission, not a CSS-hidden one.
//
// Advice quotes: fetched from advice_quotes (0007 migration), which
// returns text alone, never a field. This page must never attempt to
// filter or join that data back to `field`, no matter how convenient —
// see lib/explore/pickQuotes.js and components/explore/AdviceQuotes.jsx.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  fetchFieldStats,
  fetchFieldDetailStats,
  fetchAdviceQuotes,
} from '@/lib/supabase/queries';
import { FIELDS, getFieldRawBySlug } from '@/lib/explore/fields';
import { pickQuotes } from '@/lib/explore/pickQuotes';
import { formatSampleSize } from '@/lib/explore/sampleSize';
import { displayLabel } from '@/lib/i18n/labels';
import en from '@/lib/i18n/en';
import Kicker from '@/components/arah/Kicker.jsx';
import FlowButton from '@/components/arah/FlowButton.jsx';
import SatisfactionChartLoader from '@/components/explore/SatisfactionChartLoader.jsx';
import CommonRoutes from '@/components/explore/CommonRoutes.jsx';
import AdviceQuotes from '@/components/explore/AdviceQuotes.jsx';

const QUOTES_PER_PAGE = 3;

export function generateStaticParams() {
  return FIELDS.map((f) => ({ field: f.slug }));
}

// Any slug not returned above 404s instead of being rendered at request
// time — the ten fields are a closed, known set (feature_spec.json's
// `classes`), so there is no legitimate "eleventh field" to render.
export const dynamicParams = false;

/** Presentation-only split, identical to /results/[id]'s splitLabel(). */
function splitLabel(label) {
  const m = /^(.*?)\s*\((.+?)\)\s*$/.exec(label);
  return m ? { name: m[1], detail: m[2] } : { name: label, detail: null };
}

export async function generateMetadata({ params }) {
  const { field: slug } = await params;
  const raw = getFieldRawBySlug(slug);
  if (!raw) return {};
  const { name } = splitLabel(displayLabel(raw));
  return {
    title: `${name} — ${en.explore.metaTitle}`,
    description: en.explore.metaDescription,
  };
}

export default async function FieldDetailPage({ params }) {
  const { field: slug } = await params;
  const raw = getFieldRawBySlug(slug);
  if (!raw) notFound();

  const supabase = await createClient();
  const [statsRows, detailRows] = await Promise.all([
    fetchFieldStats(supabase),
    fetchFieldDetailStats(supabase),
  ]);

  const stats = statsRows.find((r) => r.field_of_study === raw);
  const detail = detailRows.find((r) => r.field_of_study === raw);
  // Every one of the ten static slugs has a field_stats row by construction
  // (field_stats groups over every field_of_study value in alumni_profiles,
  // and feature_spec.json's classes are exactly those ten values) — this is
  // a defensive 404, not an expected path.
  if (!stats) notFound();

  const suppressed = Boolean(stats.suppressed);
  // Band for an unsuppressed field, exact count for a suppressed one —
  // never an exact count for an unsuppressed field (0009 hardening).
  const sampleSizeDisplay = formatSampleSize(stats.sample_size, stats.sample_size_band);

  // Quotes are only ever fetched for an unsuppressed field — structurally,
  // not just visually, omitted for the two small fields.
  const quotes = suppressed
    ? []
    : pickQuotes(await fetchAdviceQuotes(supabase), slug, QUOTES_PER_PAGE);

  const { name, detail: parenDetail } = splitLabel(displayLabel(raw));

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-14 md:px-16 md:py-20">
      <Link
        href="/explore"
        className="inline-flex min-h-11 w-fit items-center text-[13px] text-muted-foreground transition-colors duration-200 hover:text-violet-lt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt"
      >
        ← {en.explore.detail.back}
      </Link>

      <section className="mt-6 max-w-[720px]">
        <Kicker>{en.explore.detail.kicker}</Kicker>
        <h1 className="font-display mt-6 max-w-[18ch] text-balance text-[42px] leading-[1.08] md:text-[56px]">
          {name}
        </h1>
        {parenDetail ? (
          <p className="mt-3 max-w-[52ch] text-[15px] text-muted-foreground">
            {parenDetail}
          </p>
        ) : null}

        <p className="mt-7 max-w-[52ch] text-base leading-[1.6] text-text md:text-lg">
          <span className="font-mono">{sampleSizeDisplay}</span>{' '}
          {en.explore.detail.sampleSizeLabel}
        </p>
      </section>

      {suppressed ? (
        <section className="mt-14 max-w-[720px] border-t border-hairline pt-10 md:mt-20">
          <h2 className="font-display text-[24px] md:text-[30px]">
            {en.explore.detail.suppressedTitle}
          </h2>
          <p className="mt-4 max-w-[56ch] text-[15px] leading-[1.6] text-text">
            {Number.isFinite(stats.sample_size)
              ? `${en.results.suppressedLead} ${stats.sample_size} ${en.results.suppressedTail}`
              : en.results.suppressedNoCount}
          </p>
          <p className="mt-4 max-w-[56ch] text-[15px] leading-[1.6] text-muted-foreground">
            {en.explore.detail.suppressedBody}
          </p>
          <FlowButton href="/explore" className="mt-8 w-fit">
            {en.explore.detail.back}
          </FlowButton>
        </section>
      ) : (
        <>
          <section className="mt-14 max-w-[860px] border-t border-hairline pt-10 md:mt-20">
            <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-lt">
              {en.explore.detail.satisfactionKicker}
            </h2>
            <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-muted-foreground">
              {en.explore.detail.satisfactionIntro}
            </p>
            <div className="mt-6">
              <SatisfactionChartLoader
                distribution={detail?.satisfaction_distribution}
              />
            </div>
          </section>

          <section className="mt-14 grid max-w-[860px] grid-cols-1 gap-10 border-t border-hairline pt-10 md:mt-20 md:grid-cols-2">
            <CommonRoutes
              kicker={en.explore.detail.preuKicker}
              intro={en.explore.detail.preuIntro}
              distribution={detail?.preu_distribution}
            />
            <CommonRoutes
              kicker={en.explore.detail.streamsKicker}
              intro={en.explore.detail.streamsIntro}
              distribution={detail?.stream_distribution}
            />
          </section>

          {quotes.length > 0 ? (
            <section className="mt-14 max-w-[720px] border-t border-hairline pt-10 md:mt-20">
              <AdviceQuotes quotes={quotes} />
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
