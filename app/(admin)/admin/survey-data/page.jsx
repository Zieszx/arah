// /admin/survey-data — the survey data browser (Plan 5, Task 3). All 207
// verified alumni rows, searchable and sortable, rendered through
// SurveyTable.jsx's PrimeReact DataTable (its CSS scoped to this route
// only — see that component's header comment).
//
// requireAdmin() runs again here even though app/(admin)/layout.jsx
// already called it — same reasoning as app/(admin)/admin/page.jsx's
// header comment: a shared layout does not re-render on client-side
// navigation between the sibling routes it wraps, so every admin page
// re-checks. Both calls share one cached DB read via React's cache().
//
// This is the ONE screen in the whole app that renders alumni_profiles'
// free-text advice column (lib/admin/survey.js's header comment explains
// why the raw table is otherwise never client-readable at all). The
// notice below is not decorative — it's the one guard rail between "an
// admin reading survey feedback for support" and "an admin pasting a
// real student's words into a deck".
import requireAdmin from '@/lib/auth/requireAdmin';
import { getSurveyPage } from '@/lib/admin/survey';
import { parsePageParams } from '@/lib/admin/pagination';
import { isSortable } from '@/lib/admin/surveyQuery';
import Kicker from '@/components/arah/Kicker.jsx';
import SurveyTable from '@/components/admin/SurveyTable.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.surveyData.metaTitle,
  robots: { index: false, follow: false },
};

const BASE_PATH = '/admin/survey-data';

export default async function AdminSurveyDataPage({ searchParams }) {
  await requireAdmin();

  // searchParams is a Promise in Next 16.
  const params = (await searchParams) ?? {};
  const { page, pageSize } = parsePageParams(params);
  const query = typeof params.q === 'string' ? params.q : '';
  // Anything not on the allowlist collapses to the default order rather than
  // reaching the order clause — `sort` comes straight from the query string.
  const sort = isSortable(params.sort) ? params.sort : 'field';
  const order = params.order === 'desc' ? 'desc' : 'asc';

  const result = await getSurveyPage({ page, pageSize, query, sort, order });
  const t = en.admin.surveyData;

  // Echoed back to the table so it can build hrefs that preserve every
  // filter — normalised, so a hostile `?sort=;drop` never round-trips.
  const canonicalParams = {
    q: query,
    sort,
    order,
    page: result?.page ?? page,
    pageSize,
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber/30 bg-amber/10 px-5 py-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="mt-0.5 size-5 shrink-0 fill-amber"
        >
          <path d="M10 1.5 1 17h18L10 1.5zm0 5.5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zm0 8a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3z" />
        </svg>
        <p className="text-sm font-medium leading-[1.6] text-amber">{t.notice}</p>
      </div>

      {result === null ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline text-center">
          <p className="text-sm font-medium text-danger">
            Couldn’t load the survey rows just now.
          </p>
          <p className="text-sm text-muted-foreground">Refresh to retry.</p>
        </div>
      ) : (
        <SurveyTable
          rows={result.rows}
          total={result.total}
          page={result.page}
          pageCount={result.pageCount}
          query={query}
          sort={sort}
          order={order}
          basePath={BASE_PATH}
          searchParams={canonicalParams}
        />
      )}
    </div>
  );
}
