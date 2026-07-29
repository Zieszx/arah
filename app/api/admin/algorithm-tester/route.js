// POST /api/admin/algorithm-tester — the algorithm tester's only server
// dependency (Plan 5, Task 6). Forwards a full set of answers straight to
// the ML service and returns exactly what it returned: `ranked`,
// `model_version`, `marginalised`. No annotation (lib/quiz/submission.js's
// annotateRanked, which needs field_stats and is deliberately k-anonymity
// hardened), no persistence — nothing about a test run is ever written to
// quiz_responses or predictions. This route exists purely so the browser
// never needs the ML service's own base URL (mlBaseUrl() reads
// process.env, which a client component cannot).
//
// Gated exactly like app/api/admin/contributions/route.js: authenticate
// against the RLS-bound client, THEN re-derive is_admin from the DB. The
// page only decides whether the form renders; this route is what an
// attacker could actually reach directly, so it re-checks regardless.
import { createClient } from '@/lib/supabase/server';
import { validateAnswers } from '@/lib/features';
import { cleanAnswers, isValidPrediction, mlBaseUrl } from '@/lib/quiz/submission';
import en from '@/lib/i18n/en';

const ML_TIMEOUT_MS = 15_000;

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
    // 1. Authenticate.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: 'auth_required', message: en.api.admin.authRequired },
        { status: 401 }
      );
    }

    // 2. Authorize — re-checked server-side, same posture as
    // app/api/admin/contributions/route.js.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile?.is_admin) {
      return Response.json(
        { error: 'forbidden', message: en.api.admin.forbidden },
        { status: 403 }
      );
    }

    // 3. Validate — the same trust boundary /api/questions uses. This is
    // a testing tool, not a shortcut around the spec: a malformed or
    // incomplete answer set is rejected here exactly as it would be for a
    // real student, so what this screen demonstrates is genuinely the
    // production path.
    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const rawAnswers =
      body && typeof body === 'object' && !Array.isArray(body) ? body.answers : null;
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      return Response.json(
        { error: 'invalid_request', message: en.api.invalidRequest },
        { status: 422 }
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
        { status: 422 }
      );
    }

    // 4. The model — nothing persisted either side of this call.
    const { prediction, detail } = await fetchPrediction(answers);
    if (!prediction) {
      console.error(`[api/admin/algorithm-tester] prediction failed: ${detail}`);
      return Response.json(
        { error: 'prediction_unavailable', message: en.api.predictionUnavailable },
        { status: 502 }
      );
    }

    return Response.json(prediction, { status: 200 });
  } catch (err) {
    console.error('[api/admin/algorithm-tester]', err);
    return Response.json(
      { error: 'server_error', message: en.api.serverError },
      { status: 500 }
    );
  }
}
