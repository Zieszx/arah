// Pure query-building for the admin survey browser — no database client, no
// server-only import, so tests/js/admin-survey-query.test.js can exercise the
// two things here that are genuinely dangerous to get wrong: PostgREST `or`
// escaping, and the sortable-column allowlist.
//
// This replaced the in-browser filter/sort in lib/admin/surveyTable.js. That
// module scanned all 207 rows on every keystroke, which was reasonable at
// that size and becomes a growing unbounded payload once approved
// contributions start landing.
import { getGroups } from '@/lib/features';

/** Plain text columns the search box matches with ILIKE. */
export const TEXT_SEARCH_COLUMNS = [
  'field_of_study',
  'spm_results',
  'preu_program',
  'advice',
];

/**
 * Column key -> real database column. This is an allowlist, not a
 * convenience map: `sort` arrives from the query string and is interpolated
 * into the order clause, so anything not named here must fall back to the
 * default rather than reach Postgres.
 */
export const SORT_COLUMNS = {
  field: 'field_of_study',
  stream: 'streams',
  results: 'spm_results',
  preu: 'preu_program',
  satisfaction: 'satisfaction',
};

export const SORTABLE_COLUMNS = Object.keys(SORT_COLUMNS);

/** Is this a column we are willing to sort by? */
export function isSortable(sort) {
  return typeof sort === 'string' && Object.hasOwn(SORT_COLUMNS, sort);
}

/**
 * The six stream values, read from the trained feature spec rather than
 * retyped here — a list that drifts from the spec would silently stop
 * matching rows.
 */
export function streamOptions() {
  const group = getGroups().find((g) => g.key === 'stream');
  return Array.isArray(group?.options) ? group.options : [];
}

/**
 * PostgREST's `or` filter is a comma-separated list inside ONE string, with
 * parentheses delimiting the group. An unescaped comma, parenthesis or
 * backslash in the user's query therefore ends the clause early and changes
 * what the filter means — and every real field value here contains both a
 * comma and parentheses, e.g. "Science (Biology, Chemistry etc)". Escaping
 * is load-bearing, not defensive.
 */
export function escapeForOr(value) {
  return String(value).replace(/[\\(),]/g, (c) => `\\${c}`);
}

/**
 * The raw survey text an admin's query should also match.
 *
 * lib/i18n/labels.js corrects two genuine survey typos on the way to the
 * screen — "Resiliant" renders as "Resilient", "Dentristry" as "Dentistry".
 * An admin reads the corrected spelling and naturally searches for it, but
 * the database still holds the raw one, so searching the typed query alone
 * would silently find nothing. `corrections` is labels.js#correctionEntries().
 */
export function searchVariants(query, corrections = []) {
  const q = String(query).toLowerCase();
  const variants = [query];
  for (const [raw, corrected] of corrections) {
    if (String(corrected).toLowerCase().includes(q)) variants.push(raw);
  }
  return variants;
}

/** The full `or(...)` argument for one search query. */
export function buildOrClause(query, corrections = []) {
  const clauses = [];
  for (const variant of searchVariants(query, corrections)) {
    const safe = escapeForOr(variant);
    for (const column of TEXT_SEARCH_COLUMNS) {
      clauses.push(`${column}.ilike.*${safe}*`);
    }
  }
  // `streams` is a text[] and ILIKE cannot reach inside it. There are only
  // six possible values, so a text query is resolved against that list and
  // becomes exact array-contains conditions instead.
  const q = String(query).toLowerCase();
  for (const option of streamOptions()) {
    if (option.toLowerCase().includes(q)) {
      clauses.push(`streams.cs.{"${option.replace(/"/g, '\\"')}"}`);
    }
  }
  return clauses.join(',');
}
