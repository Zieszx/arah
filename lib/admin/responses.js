// Data for /admin/responses and /admin/responses/[id] (Task 4).
//
// Reads through the service-role client deliberately, exactly like
// lib/admin/survey.js and lib/admin/overview.js: an admin needs every
// student's row, not just their own, and quiz_responses/predictions' RLS
// policies only grant an admin SELECT on their OWN queries when going
// through the request-scoped client is awkward for a cross-student list
// like this one (0005_profiles_admin.sql's "admins read responses" /
// "admins read predictions" policies exist for exactly this, but this
// module uses the admin client anyway to match the rest of app/(admin)'s
// data layer and avoid a second, RLS-bound client just for this page).
// Never imported outside app/(admin) — this is personal student data,
// shown to admins for support only (Plan 3's data policy), and Task 4's
// brief is explicit: no CSV export, no bulk-egress affordance anywhere
// near this module.
//
// quiz_responses.user_id and predictions.user_id both reference
// auth.users(id) directly (0001_init.sql) — not profiles(id) via a
// PostgREST-visible foreign key — so profiles can't be embedded in a
// single .select() call here. Three independent queries, joined in
// memory by id: cheap at this data's size (tens to low hundreds of rows
// today), and it keeps every query a plain equality/order Postgres can
// answer without a hand-written view.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRenderableEntry, topRenderableEntry } from '@/lib/results/ranked';
import { findDisagreement } from '@/lib/admin/disagreements';
import { rangeFor, pageCount, clampPage } from '@/lib/admin/pagination';

// How far back the disagreements view looks. It cannot be a SQL filter (see
// getResponsesList), so this is the honest trade: a bounded scan whose bound
// is reported to the reader, rather than an unbounded one that gets slower
// every week or a silent cap that reads as "nothing more to find".
const DISAGREEMENT_SCAN_LIMIT = 1000;

const CONTRIBUTION_COLUMNS =
  'field_of_study, school_type, spm_results, streams, subjects_enjoyed, subjects_difficult, tasks_enjoyed, characteristics, personality, public_speaking, preu_program';

async function fetchContributedRows(supabase) {
  const { data, error } = await supabase
    .from('alumni_profiles')
    .select(CONTRIBUTION_COLUMNS)
    .eq('source', 'user_contributed');
  if (error) throw error;
  return data ?? [];
}

async function fetchProfileNames(supabase) {
  const { data, error } = await supabase.from('profiles').select('id, display_name');
  if (error) throw error;
  const byId = new Map();
  for (const row of data ?? []) byId.set(row.id, row.display_name ?? null);
  return byId;
}

/**
 * Every submission (quiz_responses row), newest first, annotated with its
 * prediction (if one completed), the signed-in student's display name,
 * and whether it's a "disagreement" (see lib/admin/disagreements.js).
 * Returns null on failure — the page renders a designed error state, same
 * convention as lib/admin/survey.js#getSurveyRows.
 *
 * Shape: { rows, contributedCount } | null (null on failure).
 * Each row: { id, createdAt, studentName, marginalised, topField,
 *   hasPrediction, disagreementField }
 * `topField` and `disagreementField` are RAW spec strings — render
 * through lib/i18n/labels.js#displayLabel at the last moment, never here.
 * `contributedCount` is the total number of contributed alumni rows that
 * exist at all (regardless of whether any matched) — the list page needs
 * this to tell "no contributions exist yet" apart from "contributions
 * exist, none happen to disagree", two different empty states for the
 * disagreements filter.
 */
export async function getResponsesList({ page = 1, pageSize = 25, filter = 'all' } = {}) {
  const supabase = createAdminClient();
  const disagreementsOnly = filter === 'disagreements';
  try {
    // Paged in Postgres for the default view. This used to select every
    // quiz_responses row AND every predictions row on every visit — fine at
    // tens of rows, and exactly the query that quietly becomes the slowest
    // page in the product once real students arrive.
    //
    // The disagreements view cannot be paged that way. "Disagreement" is a
    // fingerprint match computed in JavaScript against contributed alumni
    // rows (lib/admin/disagreements.js) because no foreign key links a
    // contribution to the submission it came from — there is no SQL
    // predicate to put in a WHERE clause. So that view scans a BOUNDED
    // window of recent submissions and pages the matches in memory, and
    // reports `scanLimited` so the page can say so out loud. A silent cap
    // would read as "there are no more disagreements", which is a different
    // and false statement.
    const { from, to } = disagreementsOnly
      ? { from: 0, to: DISAGREEMENT_SCAN_LIMIT - 1 }
      : rangeFor(page, pageSize);

    const {
      data: quizRows,
      error: quizError,
      count,
    } = await supabase
      .from('quiz_responses')
      .select('id, user_id, answers, created_at', { count: 'exact' })
      // created_at then id: rows sharing a timestamp must not be free to
      // swap between pages, which is how a row goes missing from one page
      // and shows up twice on another.
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    if (quizError) throw quizError;

    const submissionCount = count ?? 0;
    const ids = (quizRows ?? []).map((row) => row.id);

    const [{ data: predictionRows, error: predError }, names, contributed] =
      await Promise.all([
        ids.length
          ? supabase
              .from('predictions')
              .select('id, quiz_response_id, results, model_version, marginalised, created_at')
              .in('quiz_response_id', ids)
          : Promise.resolve({ data: [], error: null }),
        fetchProfileNames(supabase),
        fetchContributedRows(supabase),
      ]);
    if (predError) throw predError;

    const predictionByResponseId = new Map();
    for (const row of predictionRows ?? []) {
      // A quiz_response has at most one real prediction in normal
      // operation (app/api/questions/route.js inserts one per submission);
      // if more than one somehow exists, the newest wins.
      const existing = predictionByResponseId.get(row.quiz_response_id);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
        predictionByResponseId.set(row.quiz_response_id, row);
      }
    }

    const rows = (quizRows ?? []).map((row) => {
      const prediction = predictionByResponseId.get(row.id) ?? null;
      const top = prediction ? topRenderableEntry(prediction.results) : null;
      const topField = top?.field ?? null;
      const disagreementField = topField
        ? findDisagreement(row.answers, topField, contributed)
        : null;
      return {
        id: row.id,
        createdAt: row.created_at,
        studentName: names.get(row.user_id) ?? null,
        marginalised: prediction?.marginalised ?? null,
        topField,
        hasPrediction: Boolean(prediction),
        disagreementField,
      };
    });

    if (!disagreementsOnly) {
      return {
        rows,
        contributedCount: contributed.length,
        total: submissionCount,
        page,
        pageCount: pageCount(submissionCount, pageSize),
        scanLimited: false,
        scanLimit: null,
      };
    }

    // Matches within the scanned window, then paged in memory.
    const matches = rows.filter((row) => row.disagreementField);
    const total = matches.length;
    const safePage = clampPage(page, total, pageSize);
    const start = (safePage - 1) * pageSize;

    return {
      rows: matches.slice(start, start + pageSize),
      contributedCount: contributed.length,
      total,
      page: safePage,
      pageCount: pageCount(total, pageSize),
      // True when there are older submissions this view did not look at, so
      // the page can state the bound rather than imply completeness.
      scanLimited: submissionCount > DISAGREEMENT_SCAN_LIMIT,
      scanLimit: DISAGREEMENT_SCAN_LIMIT,
    };
  } catch (error) {
    console.error('admin responses: list failed:', error?.code ?? error?.message);
    return null;
  }
}

/**
 * One submission in full — every stored answer plus the complete ranked
 * prediction — for /admin/responses/[id]. Null for "not found", the same
 * way the RLS-scoped student-facing lib/supabase/queries.js#fetchPredictionById
 * treats "not found" and "not yours" alike; here there is no "not yours"
 * case (an admin may read any row), but a bad/unknown id is still just
 * absent data, not an error.
 */
export async function getResponseDetail(id) {
  const supabase = createAdminClient();
  try {
    const [{ data: quizRow, error: quizError }, { data: predictionRows, error: predError }, names, contributed] =
      await Promise.all([
        supabase
          .from('quiz_responses')
          .select('id, user_id, answers, created_at')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('predictions')
          .select('id, quiz_response_id, results, model_version, marginalised, created_at')
          .eq('quiz_response_id', id)
          .order('created_at', { ascending: false })
          .limit(1),
        fetchProfileNames(supabase),
        fetchContributedRows(supabase),
      ]);
    if (quizError) throw quizError;
    if (predError) throw predError;
    if (!quizRow) return null;

    const prediction = predictionRows?.[0] ?? null;
    const ranked = prediction
      ? (Array.isArray(prediction.results?.ranked) ? prediction.results.ranked.filter(isRenderableEntry) : [])
      : [];
    const topField = ranked[0]?.field ?? null;
    const disagreementField = topField
      ? findDisagreement(quizRow.answers, topField, contributed)
      : null;

    return {
      id: quizRow.id,
      createdAt: quizRow.created_at,
      answers: quizRow.answers ?? {},
      studentName: names.get(quizRow.user_id) ?? null,
      prediction: prediction
        ? {
            modelVersion: prediction.model_version,
            marginalised: prediction.marginalised,
            ranked,
          }
        : null,
      disagreementField,
    };
  } catch (error) {
    console.error('admin responses: detail failed:', error?.code ?? error?.message, id);
    return null;
  }
}
