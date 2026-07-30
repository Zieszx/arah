// /results/[id] — the payoff screen. A Server Component that READS the
// stored prediction row and never recomputes: a shared or bookmarked link
// must show the same result forever, even after the model is retrained.
// Re-running the model on page load would silently change a student's
// answer under them.
//
// Access control, two layers: proxy.js redirects unauthenticated requests
// to /login?next=…, and this page re-checks the session server-side
// (optimistic cookie checks are not the last line of defence — see
// node_modules/next/dist/docs/01-app/02-guides/authentication.md). The read
// itself goes through the request-scoped, RLS-bound client, so another
// student's row is simply invisible — "not found" and "not yours" both
// render the same 404, never a 403 that would disclose the id exists.
//
// Honesty requirements carried by this page:
//  - the top field is framed as "students like you chose this", never
//    "you should study this" — the ranking is a starting point, not a
//    verdict, and the dissent section says so in as many words;
//  - n and the model version are stated visibly but quietly;
//  - every field name renders through displayLabel (the stored rows keep
//    the raw survey strings, typos included).
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchPredictionById, fetchQuizAnswers } from '@/lib/supabase/queries';
import { isRenderableEntry } from '@/lib/results/ranked';
import { cohortSize } from '@/lib/results/cohort';
import { formatSampleSizeInSentence } from '@/lib/explore/sampleSize';
import featureSpec from '@/services/ml/feature_spec.json';
import { displayLabel } from '@/lib/i18n/labels';
import en from '@/lib/i18n/en';
import Kicker from '@/components/arah/Kicker.jsx';
import FlowButton from '@/components/arah/FlowButton.jsx';
import ResultList from '@/components/results/ResultList.jsx';
import MarginalisedNotice from '@/components/results/MarginalisedNotice.jsx';

export const metadata = {
  title: en.results.metaTitle,
  description: en.results.metaDescription,
  // A personal result must never end up in a search index.
  robots: { index: false, follow: false },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Presentation-only split of a field label: the class names carry a long
 * parenthetical ("Business & Management (Accounting, Finance, Marketing
 * etc)") that would fight a display-size headline. The name goes large,
 * the parenthetical becomes a quiet subline. No data is altered.
 */
function splitLabel(label) {
  const m = /^(.*?)\s*\((.+?)\)\s*$/.exec(label);
  return m ? { name: m[1], detail: m[2] } : { name: label, detail: null };
}

export default async function ResultsPage({ params }) {
  const { id } = await params;
  // Junk ids 404 before touching the database (a non-UUID would error the
  // uuid-typed query, and there is nothing it could ever match anyway).
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/results/${id}`)}`);
  }

  // The stored row — RLS-scoped, so this is null for any row the signed-in
  // student does not own, indistinguishably from a row that never existed.
  const row = await fetchPredictionById(supabase, id);
  if (!row) notFound();

  const ranked = Array.isArray(row.results?.ranked)
    ? row.results.ranked.filter(isRenderableEntry)
    : [];
  if (ranked.length === 0) notFound();

  // n — the alumni behind this prediction. NOT a sum over the ranked
  // entries: since the 0009 hardening only SUPPRESSED fields carry an exact
  // alumni_count, so that sum silently became 9 + 7 = 16 and the page read
  // "20–49 of the 16 students most like you studied this". See
  // lib/results/cohort.js. Returns null when it cannot be known, and every
  // use below renders nothing rather than a wrong number.
  const total = cohortSize(row.results, featureSpec);

  const top = ranked[0];
  const topFive = ranked.slice(0, 5);
  const { name: topName, detail: topDetail } = splitLabel(
    displayLabel(top.field)
  );
  // Exact for a suppressed field, banded for an unsuppressed one — the same
  // formatter ResultList and /explore use, so the three can never disagree
  // about what is safe to show.
  const topSampleDisplay = formatSampleSizeInSentence(top.alumni_count, top.alumni_band);

  // The marginalised re-run needs the original answers (own row, RLS-scoped).
  const answers =
    row.marginalised && row.quiz_response_id
      ? await fetchQuizAnswers(supabase, row.quiz_response_id)
      : null;

  // "n = null" would be worse than saying nothing, so the n is dropped from
  // the provenance line entirely when the cohort cannot be established.
  const provenance =
    total === null
      ? `${en.results.model} ${row.model_version}`
      : `n = ${total} · ${en.results.model} ${row.model_version}`;

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      {/* The ARAH logotype moved into the global SiteHeader (Task 7);
          this row keeps only the per-result provenance line. */}
      <header className="flex items-center justify-end gap-6">
        <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
          {provenance}
        </span>
      </header>

      {/* 1 — the headline result: the field's NAME first, large, in
          Instrument Serif. Not a percentage; a student wants to know what
          to look at, not what the number is. */}
      <section className="mt-14 max-w-[860px] md:mt-24">
        <Kicker>{en.results.kicker}</Kicker>
        <p className="mt-6 text-[15px] text-muted-foreground md:text-base">
          {en.results.eyebrow}
        </p>
        <h1 className="font-display mt-3 max-w-[18ch] text-balance text-[42px] leading-[1.08] md:text-[64px]">
          {topName}
        </h1>
        {topDetail ? (
          <p className="mt-4 max-w-[52ch] text-[15px] text-muted-foreground md:text-base">
            {topDetail}
          </p>
        ) : null}

        {/* The single most important sentence on the page. The count is the
            shared formatter's output — exact for a suppressed field, banded
            for an unsuppressed one — and the denominator is the real cohort,
            never a sum over the entries. Rendered only when both are known. */}
        {topSampleDisplay !== null && total !== null ? (
          <p className="mt-7 max-w-[52ch] text-base leading-[1.6] text-text md:text-lg">
            <span className="font-mono">{topSampleDisplay}</span>{' '}
            {en.results.explainOf}{' '}
            <span className="font-mono">{total}</span>{' '}
            {en.results.explainTail}
          </p>
        ) : null}

        <p className="mt-4 font-mono text-xs text-muted-foreground sm:hidden">
          {provenance}
        </p>
      </section>

      {row.marginalised ? (
        <MarginalisedNotice
          answers={answers}
          className="mt-10 max-w-[860px] md:mt-14"
        />
      ) : null}

      {/* 2 — the ranked list, staggered in per §5b. */}
      <section className="mt-14 max-w-[860px] md:mt-24">
        <Kicker>{en.results.listKicker}</Kicker>
        <p className="mt-3 max-w-[52ch] text-[15px] text-muted-foreground">
          {en.results.listIntro}
        </p>
        <div className="mt-8 md:mt-10">
          <ResultList entries={topFive} total={total} />
        </div>
      </section>

      {/* 6 — dissent is a legitimate outcome, not an error. */}
      <section className="mt-16 max-w-[860px] border-t border-hairline pt-10 md:mt-24 md:pt-14">
        <h2 className="font-display text-[24px] md:text-[30px]">
          {en.results.dissent.title}
        </h2>
        <p className="mt-4 max-w-[56ch] text-[15px] leading-[1.6] text-muted-foreground md:text-base">
          {en.results.dissent.body}
        </p>
        <FlowButton href="/explore" className="mt-8 w-fit">
          {en.results.dissent.cta}
        </FlowButton>
      </section>

      {/* Per-result provenance stays with the result (the STORED model
          version, which can differ from the current one the global
          SiteFooter states). The old "back home" link moved into the
          global chrome. */}
      <footer className="mt-16 border-t border-hairline pt-8 md:mt-24">
        <span className="font-mono text-xs text-muted-foreground">
          {total === null
            ? `${en.results.model} ${row.model_version}`
            : `${en.results.matchedAgainst} ${total} ${en.results.alumni} · ${en.results.model} ${row.model_version}`}
        </span>
      </footer>
    </main>
  );
}
