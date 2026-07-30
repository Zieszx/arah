// Real advice quotes on /explore/[field] — the free-text answers real
// alumni left for the student reading this page. Rendered ONLY for
// unsuppressed fields: app/explore/[field]/page.jsx does not even fetch
// quotes for a suppressed field, let alone pass them here, so there is no
// path by which this component could be reached with n<10.
//
// The quotes prop comes from the advice_quotes view (0007 migration),
// which returns the advice column ALONE — no field_of_study, no
// demographics, no id. This component (and the page that calls it) must
// never attempt to join or filter that data back to a field; the
// attribution below is deliberately generic ("From students who took this
// path"), not "N students in this field said," because the underlying
// query has no way to know which field a given quote came from and must
// not be made to.
//
// Pure presentational component: no hooks, no client state, server-safe.
import en from '@/lib/i18n/en';

export default function AdviceQuotes({ quotes, className }) {
  if (!Array.isArray(quotes) || quotes.length === 0) return null;

  return (
    <section className={className}>
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-lt">
        {en.explore.detail.quotesKicker}
      </h3>
      <ul className="mt-5 flex flex-col gap-5">
        {quotes.map((quote) => (
          <li key={quote}>
            <blockquote className="border-l-2 border-violet/60 pl-5 text-[15px] leading-[1.6] text-text">
              “{quote}”
            </blockquote>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[13px] text-muted-foreground">
        {en.explore.detail.quotesAttribution}
      </p>
    </section>
  );
}
