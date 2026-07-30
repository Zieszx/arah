// /admin/response-charts — the Forms-style summary of every question.
//
// requireAdmin() runs again here even though app/(admin)/layout.jsx already
// called it: a shared layout does not re-render on client-side navigation
// between the sibling routes it wraps, so every admin page re-checks. Both
// calls share one cached DB read via React's cache().
//
// Two sources, chosen by ?source=. They are never merged — see
// lib/admin/responseCharts.js for why averaging alumni outcomes together
// with current students' self-descriptions would describe neither group.
//
// Exact counts here are correct and deliberate: the banding and suppression
// in migrations 0009/0010 protect the PUBLIC pages, where views can be
// subtracted from each other to isolate a person. This page is service-role
// behind requireAdmin(), the same call lib/admin/overview.js already makes.
import Link from 'next/link';
import requireAdmin from '@/lib/auth/requireAdmin';
import { getResponseCharts, CHART_SOURCES } from '@/lib/admin/responseCharts';
import Kicker from '@/components/arah/Kicker.jsx';
import QuestionChartCard from '@/components/admin/QuestionChartCard.jsx';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.responseCharts.metaTitle,
  robots: { index: false, follow: false },
};

const t = en.admin.responseCharts;

const tabClass = cn(
  'inline-flex min-h-10 items-center rounded-full border px-4 text-sm',
  'transition-colors duration-200',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
);

export default async function AdminResponseChartsPage({ searchParams }) {
  await requireAdmin();

  // searchParams is a Promise in Next 16.
  const params = (await searchParams) ?? {};
  const source = CHART_SOURCES.includes(params.source) ? params.source : 'alumni';
  const data = await getResponseCharts(source);

  const tabs = [
    { key: 'alumni', label: t.sourceAlumni },
    { key: 'students', label: t.sourceStudents },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <nav aria-label={t.sourceLabel} className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const active = tab.key === source;
            return (
              <Link
                key={tab.key}
                href={tab.key === 'alumni' ? '/admin/response-charts' : `/admin/response-charts?source=${tab.key}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  tabClass,
                  active
                    ? 'border-violet bg-violet-soft/70 font-medium text-violet-ink'
                    : 'border-hairline text-muted-foreground hover:border-violet/40 hover:text-violet-ink'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <p className="max-w-[68ch] text-sm leading-[1.6] text-muted-foreground">
          {source === 'alumni' ? t.alumniCaption : t.studentsCaption}
          {data ? (
            <>
              {' '}
              <span className="font-mono tabular-nums text-ink">{data.respondents}</span>{' '}
              {data.respondents === 1 ? t.respondent : t.respondents}.
            </>
          ) : null}
        </p>
      </div>

      {data === null ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline text-center">
          <p className="text-sm font-medium text-danger">{t.loadError}</p>
          <p className="text-sm text-muted-foreground">{t.loadErrorHint}</p>
        </div>
      ) : data.respondents === 0 ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline px-6 text-center">
          <p className="text-sm font-medium text-ink">{t.emptyTitle}</p>
          <p className="max-w-[52ch] text-sm text-muted-foreground">{t.emptyBody}</p>
        </div>
      ) : (
        // One column below 1024px and two above: these charts have long
        // category labels, and two columns of them at tablet width squeezes
        // every bar into single-digit pixels.
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {data.questions.map((question) => (
            <QuestionChartCard
              key={question.key}
              question={question}
              respondents={data.respondents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
