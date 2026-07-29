// Database access for the quiz submission flow. Every function takes the
// request-scoped, RLS-bound client from lib/supabase/server.js — nothing
// here touches the service role, so a bug in this file can never read or
// write another student's rows.
//
// Errors are thrown with the Supabase detail attached for the SERVER log
// only; the route handler catches them and returns a generic message.
// Never let one of these messages reach a response body.

function fail(where, error) {
  const err = new Error(`${where}: ${error?.message ?? 'unknown error'}`);
  err.cause = error;
  return err;
}

/** Persist the raw answers; returns { id }. */
export async function insertQuizResponse(supabase, userId, answers) {
  const { data, error } = await supabase
    .from('quiz_responses')
    .insert({ user_id: userId, answers })
    .select('id')
    .single();
  if (error) throw fail('quiz_responses insert', error);
  return data;
}

/** All rows of the k-anonymised field_stats view. */
export async function fetchFieldStats(supabase) {
  const { data, error } = await supabase
    .from('field_stats')
    .select(
      'field_of_study, sample_size, avg_satisfaction, pct_dissatisfied, common_preu, suppressed',
    );
  if (error) throw fail('field_stats select', error);
  return data ?? [];
}

/**
 * All rows of the k-anonymised field_detail_stats view (0008 migration) —
 * satisfaction distribution, pre-U route breakdown and SPM stream breakdown
 * per field, for /explore/[field]. Suppressed fields (n<10) come back with
 * `suppressed: true` and every distribution column null — never an empty
 * object, which a caller could mistake for "zero students chose anything"
 * rather than "withheld".
 */
export async function fetchFieldDetailStats(supabase) {
  const { data, error } = await supabase
    .from('field_detail_stats')
    .select(
      'field_of_study, sample_size, suppressed, satisfaction_distribution, preu_distribution, stream_distribution',
    );
  if (error) throw fail('field_detail_stats select', error);
  return data ?? [];
}

/**
 * Free-text advice from the advice_quotes view (0007 migration) — text
 * alone, never joined back to field_of_study or any other alumni_profiles
 * column (see 0007's header comment: a quote alone is not identifying, a
 * quote attributed to a field with n=7 is). Callers must not attempt to
 * filter or group this by field.
 */
export async function fetchAdviceQuotes(supabase) {
  const { data, error } = await supabase.from('advice_quotes').select('advice');
  if (error) throw fail('advice_quotes select', error);
  return (data ?? []).map((row) => row.advice).filter(Boolean);
}

/**
 * One prediction row by id, for /results/[id]. Under RLS a row the caller
 * does not own is simply invisible — this returns null for "not found"
 * and "not yours" alike, so the page can 404 without ever disclosing
 * whether the id exists.
 */
export async function fetchPredictionById(supabase, id) {
  const { data, error } = await supabase
    .from('predictions')
    .select('id, quiz_response_id, results, model_version, marginalised, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fail('predictions select', error);
  return data;
}

/**
 * The stored raw answers for one quiz response (own rows only under RLS).
 * Used by the marginalised re-run: same answers, plus a chosen pre-U route.
 */
export async function fetchQuizAnswers(supabase, quizResponseId) {
  const { data, error } = await supabase
    .from('quiz_responses')
    .select('answers')
    .eq('id', quizResponseId)
    .maybeSingle();
  if (error) throw fail('quiz_responses select', error);
  return data?.answers ?? null;
}

/**
 * Every quiz_responses row for the signed-in student, newest first, for
 * /account. `answers` is included (not just `id`/`created_at`) so an orphan
 * row — a submission whose prediction never completed — can offer a retry
 * without a second round trip.
 */
export async function fetchQuizResponsesForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('quiz_responses')
    .select('id, answers, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw fail('quiz_responses select (account)', error);
  return data ?? [];
}

/** Every prediction row for the signed-in student, newest first, for /account. */
export async function fetchPredictionsForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('id, quiz_response_id, results, model_version, marginalised, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw fail('predictions select (account)', error);
  return data ?? [];
}

/** Store the annotated prediction; returns { id } for /results/<id>. */
export async function insertPrediction(
  supabase,
  { quizResponseId, userId, results, modelVersion, marginalised },
) {
  const { data, error } = await supabase
    .from('predictions')
    .insert({
      quiz_response_id: quizResponseId,
      user_id: userId,
      results,
      model_version: modelVersion,
      marginalised,
    })
    .select('id')
    .single();
  if (error) throw fail('predictions insert', error);
  return data;
}
