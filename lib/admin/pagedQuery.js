// Runs a paged Supabase query and survives a page past the end of the data.
//
// The bug this exists for: PostgREST does not return an empty page for an
// out-of-range range. It returns an ERROR — PGRST103, "Requested range not
// satisfiable" — with `count: null`. So the obvious clamp,
//
//   const { data, count } = await query.range(from, to)
//   const safePage = clampPage(page, count ?? 0, pageSize)
//
// never fires: count is null, the total reads as 0, and the caller either
// shows an error state or an empty table. Found by asking for
// /admin/survey-data?q=engineering&page=99 during verification — 23 rows
// match, and the screen said there were none.
//
// A `count: null` from a failed range also means the total has to be fetched
// separately before the retry can know which page is actually last.
import 'server-only';
import { rangeFor, pageCount, clampPage } from '@/lib/admin/pagination';

const RANGE_NOT_SATISFIABLE = 'PGRST103';

/**
 * @param build  (page) => a Supabase query builder already carrying every
 *               filter and order, awaiting only .range()
 * @param count  () => Promise<number>  the matching-row count, used only when
 *               a retry is needed
 * @returns { rows, total, page, pageCount } — `page` is where it actually
 *          landed, which may not be the page asked for.
 */
export async function runPagedQuery({ build, count, page, pageSize, label }) {
  const attempt = async (targetPage) => {
    const { from, to } = rangeFor(targetPage, pageSize);
    return build(targetPage).range(from, to);
  };

  let result = await attempt(page);

  if (result.error?.code === RANGE_NOT_SATISFIABLE) {
    // Past the end. Find the real total, then land on the last page that
    // exists — not page 1, which would silently throw away an admin's place
    // in a long list when only the page number was stale.
    const total = await count();
    if (total === 0) {
      return { rows: [], total: 0, page: 1, pageCount: 1 };
    }
    const last = clampPage(page, total, pageSize);
    result = await attempt(last);
    if (result.error) {
      console.error(`${label}: retry at page ${last} failed:`, result.error.code);
      return null;
    }
    return {
      rows: result.data ?? [],
      total,
      page: last,
      pageCount: pageCount(total, pageSize),
    };
  }

  if (result.error) {
    console.error(`${label}: query failed:`, result.error.code ?? result.error.message);
    return null;
  }

  const total = result.count ?? 0;

  // The other direction of the same problem: a range that IS satisfiable but
  // whose page sits beyond the filtered total returns an empty array with no
  // error at all. Retry at the last real page rather than showing nothing.
  if ((result.data ?? []).length === 0 && page > 1 && total > 0) {
    const last = clampPage(page, total, pageSize);
    if (last !== page) {
      const retry = await attempt(last);
      if (retry.error) {
        console.error(`${label}: retry at page ${last} failed:`, retry.error.code);
        return null;
      }
      return {
        rows: retry.data ?? [],
        total,
        page: last,
        pageCount: pageCount(total, pageSize),
      };
    }
  }

  return {
    rows: result.data ?? [],
    total,
    page,
    pageCount: pageCount(total, pageSize),
  };
}
