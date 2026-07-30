// POST /api/questions — the join between the student-facing questions
// flow (still called "quiz" internally — see lib/i18n/en.js) and the
// trained model. Renamed from /api/quiz alongside the /questions route;
// this endpoint has no external callers, only this app's own client
// components, so every caller was updated in the same change.
//
// Sequence: authenticate → validate server-side (the trust boundary; the
// browser's validateAnswers is a convenience) → persist the raw answers →
// call the Python ML service → annotate with alumni context from
// field_stats → persist the prediction → return { id } for /results/<id>.
//
// The quiz_responses insert happens BEFORE the ML call on purpose: if the
// model is unreachable, the answers are already saved and the student can
// simply retry — nothing is ever lost to a flaky connection.
//
// Error hygiene: every failure detail is logged server-side only. Response
// bodies carry a stable error code and a plain-English message from
// lib/i18n/en.js — never a stack trace, a file path, or a vendor message.
// Plan 1 fixed exactly that leak in the Python service; it stays fixed here.
import { createClient } from '@/lib/supabase/server';
import { validateAnswers, getSpec } from '@/lib/features';
import { cohortSizeFromSpec } from '@/lib/results/cohort';
import {
  annotateRanked,
  cleanAnswers,
  isValidPrediction,
  mlBaseUrl,
} from '@/lib/quiz/submission';
import {
  fetchFieldStats,
  insertPrediction,
  insertQuizResponse,
} from '@/lib/supabase/queries';
import en from '@/lib/i18n/en';

// A cold-started Fluid instance loads the model bundle on first hit;
// leave it room before calling that a timeout.
const ML_TIMEOUT_MS = 15_000;

/**
 * Call the ML service with one retry on timeout, network failure or 5xx.
 * A 4xx is not retried — our own validation just passed, so a 4xx means
 * the two validators disagree, and the same request would only 4xx again.
 * Returns { prediction } on success, { prediction: null, detail } on
 * failure; `detail` is for the server log only.
 */
async function fetchPrediction(answers) {
  const url = `${mlBaseUrl()}/api/ml/predict`;
  let detail = 'unknown';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
        cache: 'no-store',
        signal: AbortSignal.timeout(ML_TIMEOUT_MS),
      });
      if (res.status >= 500) {
        detail = `ML service responded ${res.status} (attempt ${attempt})`;
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        detail = `ML service rejected the request: ${res.status} ${body.slice(0, 500)}`;
        break;
      }
      const data = await res.json().catch(() => null);
      if (isValidPrediction(data)) return { prediction: data };
      detail = 'ML service returned an unexpected shape';
      break;
    } catch (err) {
      detail =
        err?.name === 'TimeoutError' || err?.name === 'AbortError'
          ? `ML service timed out after ${ML_TIMEOUT_MS}ms (attempt ${attempt})`
          : `ML fetch failed (attempt ${attempt}): ${err?.message ?? err}`;
    }
  }
  return { prediction: null, detail };
}

export async function POST(request) {
  try {
    // 1. Authenticate. proxy.js does not guard /api, so this route is its
    // own gate — and RLS below enforces ownership even if this were wrong.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: 'auth_required', message: en.api.authRequired },
        { status: 401 },
      );
    }

    // 2. Validate server-side. Unknown keys and empty values are stripped
    // first so junk can never reach the database or the model; an absent
    // preu survives this untouched (omitted, never defaulted).
    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const rawAnswers =
      body && typeof body === 'object' && !Array.isArray(body)
        ? body.answers
        : null;
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      return Response.json(
        { error: 'invalid_request', message: en.api.invalidRequest },
        { status: 422 },
      );
    }
    const answers = cleanAnswers(rawAnswers);
    const { ok, errors } = validateAnswers(answers);
    if (!ok) {
      return Response.json(
        {
          error: 'invalid_answers',
          message: en.api.invalidAnswers,
          fields: Object.keys(errors).sort(),
        },
        { status: 422 },
      );
    }

    // 3. Persist the answers before calling the model, so a model failure
    // never costs the student their submission.
    const quizResponse = await insertQuizResponse(supabase, user.id, answers);

    // 4. The model.
    const { prediction, detail } = await fetchPrediction(answers);
    if (!prediction) {
      console.error(`[api/questions] prediction failed for response ${quizResponse.id}: ${detail}`);
      return Response.json(
        { error: 'prediction_unavailable', message: en.api.predictionUnavailable },
        { status: 502 },
      );
    }

    // 5. Alumni context + confidence tiers.
    const stats = await fetchFieldStats(supabase);
    const ranked = annotateRanked(prediction.ranked, stats);

    // 6. Store the annotated result as the permanent record — /results/<id>
    // reads this row, never recomputes.
    // cohort_size is stamped HERE, not derived at render time, so a shared
    // link keeps stating the n it was actually computed against even after a
    // retrain changes the corpus. Readers fall back to the current spec for
    // rows written before this existed — see lib/results/cohort.js.
    const cohort = cohortSizeFromSpec(getSpec());
    const row = await insertPrediction(supabase, {
      quizResponseId: quizResponse.id,
      userId: user.id,
      results: cohort === null ? { ranked } : { ranked, cohort_size: cohort },
      modelVersion: prediction.model_version,
      marginalised: prediction.marginalised,
    });

    // 7. Done.
    return Response.json({ id: row.id }, { status: 201 });
  } catch (err) {
    // Full detail to the server log; a calm generic message to the client.
    console.error('[api/questions]', err);
    return Response.json(
      { error: 'server_error', message: en.api.serverError },
      { status: 500 },
    );
  }
}
