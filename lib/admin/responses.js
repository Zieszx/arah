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
//
// This module used to carry a second view — "disagreements", which matched
// a submission's answers against alumni who later re-submitted the same
// answers through /contribute with a different outcome. /contribute was
// removed at the client's request, so that view could never match another
// row again and went with it. Its cost is worth recording: because no
// foreign key linked a contribution to the submission it came from, the
// filter could not be expressed in SQL and had to scan a bounded window of
// recent submissions and page the matches in memory. Removing it makes
// every query on this page a plain Postgres page again.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { isRenderableEntry, topRenderableEntry } from '@/lib/results/ranked';
import { pageCount } from '@/lib/admin/pagination';
import { runPagedQuery } from '@/lib/admin/pagedQuery';

async function fetchProfileNames(supabase) {
  const { data, error } = await supabase.from('profiles').select('id, display_name');
  if (error) throw error;
  const byId = new Map();
  for (const row of data ?? []) byId.set(row.id, row.display_name ?? null);
  return byId;
}

/**
 * Every submission (quiz_responses row), newest first, annotated with its
 * prediction (if one completed) and the signed-in student's display name.
 * Returns null on failure — the page renders a designed error state, same
 * convention as lib/admin/survey.js#getSurveyRows.
 *
 * Shape: { rows, total, page, pageCount } | null (null on failure).
 * Each row: { id, createdAt, studentName, marginalised, topField,
 *   hasPrediction }
 * `topField` is a RAW spec string — render it through
 * lib/i18n/labels.js#displayLabel at the last moment, never here.
 */
export async function getResponsesList({ page = 1, pageSize = 25 } = {}) {
  const supabase = createAdminClient();
  try {
    // Paged in Postgres. This used to select every quiz_responses row AND
    // every predictions row on every visit — fine at tens of rows, and
    // exactly the query that quietly becomes the slowest page in the
    // product once real students arrive.
    //
    // PostgREST errors (PGRST103) on a range past the end rather than
    // returning an empty page, so paging goes through runPagedQuery — see
    // its header.
    const paged = await runPagedQuery({
      label: 'admin responses',
      page,
      pageSize,
      build: () =>
        supabase
          .from('quiz_responses')
          .select('id, user_id, answers, created_at', { count: 'exact' })
          // created_at then id: rows sharing a timestamp must not be free to
          // swap between pages, which is how a row goes missing from one page
          // and shows up twice on another.
          .order('created_at', { ascending: false })
          .order('id', { ascending: false }),
      count: async () => {
        const { count: total } = await supabase
          .from('quiz_responses')
          .select('id', { count: 'exact', head: true });
        return total ?? 0;
      },
    });
    if (paged === null) return null;

    const quizRows = paged.rows;
    const submissionCount = paged.total;
    const landedPage = paged.page;
    const ids = quizRows.map((row) => row.id);

    const [{ data: predictionRows, error: predError }, names] = await Promise.all([
      ids.length
        ? supabase
            .from('predictions')
            .select('id, quiz_response_id, results, model_version, marginalised, created_at')
            .in('quiz_response_id', ids)
        : Promise.resolve({ data: [], error: null }),
      fetchProfileNames(supabase),
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
      return {
        id: row.id,
        createdAt: row.created_at,
        studentName: names.get(row.user_id) ?? null,
        marginalised: prediction?.marginalised ?? null,
        topField: top?.field ?? null,
        hasPrediction: Boolean(prediction),
      };
    });

    return {
      rows,
      total: submissionCount,
      page: landedPage,
      pageCount: pageCount(submissionCount, pageSize),
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
    const [{ data: quizRow, error: quizError }, { data: predictionRows, error: predError }, names] =
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
      ]);
    if (quizError) throw quizError;
    if (predError) throw predError;
    if (!quizRow) return null;

    const prediction = predictionRows?.[0] ?? null;
    const ranked = prediction
      ? (Array.isArray(prediction.results?.ranked) ? prediction.results.ranked.filter(isRenderableEntry) : [])
      : [];

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
    };
  } catch (error) {
    console.error('admin responses: detail failed:', error?.code ?? error?.message, id);
    return null;
  }
}
