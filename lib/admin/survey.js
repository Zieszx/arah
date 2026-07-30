// Data for the admin survey browser (Task 3, /admin/survey-data).
//
// Reads through the service-role client on purpose: alumni_profiles has no
// select policy at all (0001_init.sql) and no anon/authenticated table
// grants whatsoever (0004_tighten_alumni_grants.sql) — the raw rows,
// including free-text advice, are never client-readable by design. An
// admin browsing their own internal console, gated by requireAdmin() on
// every page.jsx that calls this module, is exactly the "may read exact
// values via the service-role client" case those migrations carve out.
// This module must never be imported by anything under app/api or a public
// page — only app/(admin)/admin/survey-data/page.jsx.
//
// `advice` is included here deliberately: this page is the one sanctioned
// place a human ever sees the raw free-text (see that page's header
// comment for the "do not republish attributed" notice). Nowhere else in
// the app selects this column for display.
//
// Search, sort and paging all happen in Postgres now. They used to happen
// in the browser over the whole table, which was fine at 207 rows and stops
// being fine the moment approved contributions start landing — the payload
// would grow without bound and there is no point at which anyone would
// notice. Doing all three server-side also keeps them coherent: paging a
// client-filtered list is meaningless, because page 2 of a filter the
// server never applied is not a real page.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { correctionEntries } from '@/lib/i18n/labels';
import { rangeFor, pageCount, clampPage } from '@/lib/admin/pagination';
import { SORT_COLUMNS, buildOrClause } from '@/lib/admin/surveyQuery';

const SELECT_COLUMNS =
  'id, field_of_study, streams, spm_results, preu_program, satisfaction, advice';

function applyFilters(builder, query) {
  let b = builder.eq('verified', true);
  const trimmed = (query ?? '').trim();
  if (trimmed) b = b.or(buildOrClause(trimmed, correctionEntries()));
  return b;
}

function applyOrder(builder, sort, order) {
  const column = SORT_COLUMNS[sort];
  const ascending = order !== 'desc';
  // Always finish on id so paging is deterministic. Rows tied on the sort
  // column must not be free to swap places between requests — that is
  // exactly how a row goes missing from one page and appears twice on
  // another, and it is invisible until someone counts.
  if (!column) {
    return builder
      .order('field_of_study', { ascending: true })
      .order('id', { ascending: true });
  }
  return builder
    .order(column, { ascending, nullsFirst: false })
    .order('id', { ascending: true });
}

/**
 * One page of verified alumni rows, searched and sorted in the database.
 *
 * Every string keeps its raw survey spelling (typos included); the caller
 * renders through lib/i18n/labels.js#displayLabel at the last moment.
 *
 * Returns { rows, total, page, pageCount } or null on failure — the page
 * renders a designed error state, same convention as the other admin data
 * modules.
 */
export async function getSurveyPage({
  page = 1,
  pageSize = 25,
  query = '',
  sort = '',
  order = 'asc',
} = {}) {
  const supabase = createAdminClient();

  function fetchPage(targetPage) {
    const { from, to } = rangeFor(targetPage, pageSize);
    let builder = supabase
      .from('alumni_profiles')
      .select(SELECT_COLUMNS, { count: 'exact' });
    builder = applyFilters(builder, query);
    builder = applyOrder(builder, sort, order);
    return builder.range(from, to);
  }

  let { data, error, count } = await fetchPage(page);
  if (error) {
    console.error(
      'admin survey-data: alumni_profiles select failed:',
      error.code ?? error.message
    );
    return null;
  }

  // A search can shrink the result set under an admin sitting on page 7.
  // .range() past the end returns an empty array rather than an error, so
  // the screen would claim there are no matches when there plainly are.
  // Re-run once against the last real page.
  const total = count ?? 0;
  const safePage = clampPage(page, total, pageSize);
  if (safePage !== page && total > 0) {
    ({ data, error } = await fetchPage(safePage));
    if (error) {
      console.error(
        'admin survey-data: clamped re-query failed:',
        error.code ?? error.message
      );
      return null;
    }
  }

  return {
    rows: data ?? [],
    total,
    page: safePage,
    pageCount: pageCount(total, pageSize),
  };
}
