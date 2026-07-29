// One field on the /explore index. Server-safe (no hooks, no client state):
// app/explore/page.jsx renders these directly as children of StaggerReveal,
// so they stay server-rendered even though StaggerReveal itself is a client
// component (composition, not a client import — see StaggerReveal's own
// module doc and components/results/AlumniContext.jsx for the same pattern).
//
// Honesty rule, identical to AlumniContext on /results: a suppressed field
// states its sample size and says plainly why the rest is withheld — never
// 0, "—", "N/A" or an imputed value. `en.results.suppressedLead/Tail` are
// reused verbatim rather than re-authored here, so the sentence can only
// ever drift from one place.
import Link from 'next/link';
import { displayLabel } from '@/lib/i18n/labels';
import { formatSampleSize } from '@/lib/explore/sampleSize';
import en from '@/lib/i18n/en';

function finite(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Presentation-only split, identical to /results/[id]'s splitLabel(). */
function splitLabel(label) {
  const m = /^(.*?)\s*\((.+?)\)\s*$/.exec(label);
  return m ? { name: m[1], detail: m[2] } : { name: label, detail: null };
}

// Violet leads, cyan supports (design system rule #3): only the
// largest-sample card gets the full violet→cyan gradient swatch, matching
// the same tone convention MatchBar/ResultList already use for "the top
// one is special, the rest stay in the violet family."
const SWATCH_LEAD = 'linear-gradient(135deg, var(--color-violet), var(--color-cyan))';
const SWATCH_SUPPORT = 'linear-gradient(135deg, var(--color-violet), var(--color-violet-pl))';

export default function FieldCard({
  raw,
  slug,
  sampleSize,
  sampleSizeBand,
  avgSatisfaction,
  commonPreu,
  suppressed,
  isLead = false,
}) {
  const { name, detail } = splitLabel(displayLabel(raw));
  const blurb = en.explore.fieldBlurbs[slug];
  // Band for an unsuppressed field ('10–19' etc), exact count for a
  // suppressed one — never an exact count for an unsuppressed field, see
  // lib/explore/sampleSize.js.
  const sampleSizeDisplay = formatSampleSize(sampleSize, sampleSizeBand);

  return (
    <Link
      href={`/explore/${slug}`}
      className="group flex min-h-11 flex-col overflow-hidden rounded-2xl border border-hairline bg-surface transition-colors duration-200 hover:border-violet-lt/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt"
    >
      <div
        aria-hidden="true"
        className="explore-scallop m-5 mb-0 h-16 w-16 shrink-0 rounded-md"
        style={{ backgroundImage: isLead ? SWATCH_LEAD : SWATCH_SUPPORT }}
      />

      <div className="flex flex-1 flex-col p-5 pt-4">
        <h3 className="font-display text-[21px] leading-[1.15] text-text md:text-[24px]">
          {name}
        </h3>
        {detail ? (
          <p className="mt-1 text-[13px] text-muted-foreground">{detail}</p>
        ) : null}

        {blurb ? (
          <p className="mt-3 max-w-[42ch] text-[14px] leading-[1.6] text-muted-foreground">
            {blurb}
          </p>
        ) : null}

        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-hairline pt-4">
          <div className="flex flex-col gap-1">
            <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {en.explore.sampleSizeLabel}
            </dt>
            <dd className="font-mono text-[15px] text-text">{sampleSizeDisplay}</dd>
          </div>
          {!suppressed && finite(avgSatisfaction) ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {en.explore.statSatisfaction}
              </dt>
              <dd className="font-mono text-[15px] text-text">
                {avgSatisfaction}
                <span className="text-muted-foreground">
                  {en.explore.statSatisfactionOutOf}
                </span>
              </dd>
            </div>
          ) : null}
          {!suppressed && typeof commonPreu === 'string' && commonPreu ? (
            <div className="flex flex-col gap-1">
              <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {en.explore.statPreu}
              </dt>
              <dd className="font-mono text-[15px] text-text">
                {displayLabel(commonPreu)}
              </dd>
            </div>
          ) : null}
        </dl>

        {suppressed ? (
          <p
            data-suppressed="true"
            className="mt-4 max-w-[46ch] text-[13px] leading-[1.6] text-muted-foreground"
          >
            {finite(sampleSize)
              ? `${en.results.suppressedLead} ${sampleSize} ${en.results.suppressedTail}`
              : en.results.suppressedNoCount}
          </p>
        ) : null}

        <span className="mt-auto flex items-center gap-1.5 pt-5 text-[13px] font-medium text-violet-lt">
          {en.explore.cardCta}
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
