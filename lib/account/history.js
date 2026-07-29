// Pure logic behind /account's quiz history list. Takes the two raw row
// sets (already RLS-scoped to the signed-in student by the caller) and
// pairs each quiz_responses row with its matching prediction, if any.
//
// The orphan case this exists to handle: Task 4 testing proved that when
// the ML service is down, POST /api/quiz still persists quiz_responses
// (deliberately, BEFORE calling the model — see app/api/quiz/route.js)
// but never gets to insert a predictions row. That quiz_responses row is
// real and belongs to the student; it must render honestly as "answers
// saved, prediction didn't finish", never as a broken link or a silently
// dropped row.
//
// A prediction row with no renderable ranked entries (isRenderableEntry —
// shared with /results/[id], which 404s on the same condition) is treated
// exactly like a missing prediction: the two pages must never disagree
// about what counts as a usable result.
import { topRenderableEntry } from '@/lib/results/ranked';

/**
 * @param {Array<{id:string, answers:object, created_at:string}>} responses
 * @param {Array<{id:string, quiz_response_id:string, results:object, model_version:string, marginalised:boolean, created_at:string}>} predictions
 * @returns {Array<{
 *   quizResponseId: string,
 *   createdAt: string,
 *   answers: object,
 *   prediction: { id: string, topField: string, marginalised: boolean } | null,
 * }>}
 */
export function buildQuizHistory(responses, predictions) {
  const safeResponses = Array.isArray(responses) ? responses : [];
  const safePredictions = Array.isArray(predictions) ? predictions : [];

  // A quiz_response_id should have at most one prediction in practice (each
  // POST /api/quiz call inserts one of each, in that order — see
  // app/api/quiz/route.js), but if duplicates ever existed, keep the first
  // one this function sees. Callers pass predictions ordered newest-first,
  // so that is also the most recent one for that response.
  const byResponseId = new Map();
  for (const p of safePredictions) {
    if (!p || byResponseId.has(p.quiz_response_id)) continue;
    byResponseId.set(p.quiz_response_id, p);
  }

  const items = safeResponses
    .filter((r) => r && typeof r.id === 'string')
    .map((r) => {
      const predictionRow = byResponseId.get(r.id) ?? null;
      const top = predictionRow ? topRenderableEntry(predictionRow.results) : null;
      return {
        quizResponseId: r.id,
        createdAt: r.created_at,
        answers: r.answers ?? null,
        // Honesty rule: a prediction row that exists but carries nothing
        // renderable is exactly as unusable to the student as no row at
        // all, so it collapses to the same orphan state.
        prediction:
          predictionRow && top
            ? {
                id: predictionRow.id,
                topField: top.field,
                marginalised: Boolean(predictionRow.marginalised),
              }
            : null,
      };
    });

  // Defensive sort — newest first — independent of the order the caller's
  // queries happened to return. `created_at` is an ISO timestamp string,
  // so lexical comparison after negation matches chronological order.
  return items.sort((a, b) => {
    const ta = Date.parse(a.createdAt ?? '');
    const tb = Date.parse(b.createdAt ?? '');
    const na = Number.isFinite(ta) ? ta : 0;
    const nb = Number.isFinite(tb) ? tb : 0;
    return nb - na;
  });
}
