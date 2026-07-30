'use client';

// One Forms-style summary card: the question, its respondent count, and the
// chart. The `ssr: false` dynamic import lives here because that option is
// only valid inside a Client Component
// (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md) — the same
// one-line-wrapper trick FieldDistributionChartLoader.jsx uses, so the page
// itself stays a Server Component and Recharts never lands in the server
// bundle or in other admin routes' JS.
//
// The loading fallback matches the chart's computed height so a page of
// fifteen cards does not reflow as each one hydrates.
import dynamic from 'next/dynamic';
import en from '@/lib/i18n/en';

const t = en.admin.responseCharts;

function estimateHeight(entries, type) {
  return type === 'num' ? 220 : Math.max(160, entries.length * 38 + 40);
}

const QuestionChart = dynamic(() => import('./QuestionChart.jsx'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label={t.chartLoading}
      className="h-full w-full animate-pulse rounded-lg bg-surface-2"
    />
  ),
});

export default function QuestionChartCard({ question, respondents }) {
  const { label, entries, type, answered, multi } = question;
  const height = estimateHeight(entries, type);
  const skipped = respondents - answered;

  return (
    <section className="flex flex-col rounded-2xl border border-hairline bg-surface p-5 md:p-6">
      <h2 className="text-[16px] font-medium leading-snug text-ink md:text-[17px]">{label}</h2>

      <p className="mt-1.5 text-[13px] text-muted-foreground">
        <span className="font-mono tabular-nums text-ink">{answered}</span>{' '}
        {answered === 1 ? t.respondent : t.respondents}
        {/* Multi-select bars sum past the respondent count — one person can
            tick three boxes. Saying so stops a reader dividing by the wrong
            denominator and concluding the percentages are broken. */}
        {multi ? ` · ${t.multiNote}` : ''}
        {skipped > 0 ? ` · ${skipped} ${t.skipped}` : ''}
      </p>

      <div className="mt-4" style={{ minHeight: height }}>
        {answered === 0 ? (
          <div className="flex h-[140px] items-center justify-center rounded-lg border border-dashed border-hairline px-4 text-center">
            <p className="text-sm text-muted-foreground">{t.noAnswers}</p>
          </div>
        ) : (
          <QuestionChart entries={entries} type={type} respondents={answered} />
        )}
      </div>
    </section>
  );
}
