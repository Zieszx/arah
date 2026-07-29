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
