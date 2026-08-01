// Warm the Python ML service while the student is answering, so the cold
// start is never paid on the submit button.
//
// Why this exists. The ml service (services/ml/) scales to zero. Its first
// invocation after an idle period has to boot a container and then import
// scikit-learn, which alone costs ~1.7s locally before joblib.load and the
// first predict_proba are even reached. Measured against the deployment on
// 2026-08-01: first prediction after idle 11.3s, warm prediction 2.8s,
// model service alone ~1.0s. The 11.3s figure breaks NFR-02 (a prediction
// inside 5s) — and it breaks it for the *first* student of the day, which
// is the worst possible person to make wait.
//
// The fix is scheduling, not optimisation. A student spends about three
// minutes between arriving at /questions and pressing submit, so the boot
// can happen inside that window at no cost to anyone. This module fires a
// GET at the service the moment the flow mounts, and again as the student
// reaches the last question in case the instance was reclaimed mid-flow.
//
// Contract, deliberately narrow:
//  - GET only. index.py answers GET with a health payload, and getting
//    there calls load(), which is the expensive part we want done early.
//  - Fire-and-forget. The return value is never awaited by the UI and
//    every failure is swallowed: a warm-up that fails must be invisible,
//    because the submit path retries on its own and reports properly.
//  - `cache: 'no-store'`, or a cached 200 would warm nothing.
//  - Never called during render or on the server.
//
// In local dev the vercel.json rewrite does not exist, so this 404s
// against Next and warms nothing. That is correct and harmless: there is
// no cold start to avoid when the service is not deployed.

/** Any path works — index.py ignores it and answers GET with health. */
const WARM_PATH = '/api/ml/health';

/** Give up well before a student could plausibly finish ten questions. */
const WARM_TIMEOUT_MS = 20_000;

// Two callers can legitimately fire in the same tick — a student who
// resumes from localStorage mounts *on* the last question, so both the
// mount effect and the last-question effect run at once. A warm instance
// stays warm for far longer than a minute, so a second request that soon
// would buy nothing and still bill an invocation.
const WARM_COOLDOWN_MS = 60_000;
let lastWarmedAt = 0;

/** Test seam: forget that anything was warmed. */
export function resetWarmCooldown() {
  lastWarmedAt = 0;
}

export function warmModelService(fetchImpl, now = Date.now) {
  const doFetch =
    fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (!doFetch) return Promise.resolve(false);

  const at = now();
  if (lastWarmedAt && at - lastWarmedAt < WARM_COOLDOWN_MS) {
    return Promise.resolve(false);
  }
  lastWarmedAt = at;

  let signal;
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    try {
      signal = AbortSignal.timeout(WARM_TIMEOUT_MS);
    } catch {
      signal = undefined;
    }
  }

  return doFetch(WARM_PATH, { method: 'GET', cache: 'no-store', signal })
    .then((res) => Boolean(res && res.ok))
    .catch(() => false);
}

/**
 * What the UI actually calls.
 *
 * The vercel.json rewrite that routes /api/ml/* to the Python service
 * exists only on a deployment, so locally this path 404s and the browser
 * logs the failed resource — console noise for a request that cannot
 * help, because there is no cold start to avoid when the service is not
 * deployed. KNOWN-ISSUES.md records this project removing link prefetch
 * for the same reason; don't reintroduce the pattern here.
 */
export function warmModelServiceIfDeployed() {
  if (process.env.NODE_ENV !== 'production') return Promise.resolve(false);
  return warmModelService();
}
