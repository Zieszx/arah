// Pure logic for the quiz submission route — everything here is
// framework-free so tests/js/quiz-submission.test.js can exercise it
// without a Next.js runtime. The route handler in app/api/quiz/route.js
// is thin glue around these functions.
import { getGroups } from '@/lib/features';
import { confidenceFromBand } from '@/lib/explore/sampleSize';

/**
 * Strictly coerce a value that *should* be a number (Postgres numeric can
 * arrive as a JSON number or, via some drivers, a string) to a finite
 * number, or null. Deliberately refuses '', null, [], booleans — loose
 * `Number()` coercion has bitten this project three times.
 */
export function finiteNumberOrNull(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Reduce a client payload to answers the spec actually knows, dropping
 * empty values entirely. Two contracts live here:
 *  - unknown keys never reach the database or the ML service;
 *  - an absent / empty `preu` (or any optional answer) is OMITTED, never
 *    defaulted and never sent as '' — key absence is what triggers
 *    marginalisation in the model.
 */
export function cleanAnswers(raw, groups = getGroups()) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const g of groups) {
    if (!Object.prototype.hasOwnProperty.call(raw, g.key)) continue;
    const v = raw[g.key];
    if (v == null) continue;
    if (typeof v === 'string' && v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[g.key] = v;
  }
  return out;
}

/**
 * Confidence tier from the alumni sample size: high ≥20, medium 10–19,
 * low <10 (including missing/suppressed rows).
 */
export function confidenceTier(alumniCount) {
  const n = finiteNumberOrNull(alumniCount) ?? 0;
  if (n >= 20) return 'high';
  if (n >= 10) return 'medium';
  return 'low';
}

/**
 * Annotate the ML service's ranked list with alumni context from the
 * field_stats view. Aggregates below the k-anonymity threshold arrive as
 * NULL — those keys are omitted from the stored entry rather than stored
 * as null/NaN. `confidence` is always present.
 *
 * field_stats hardening (0009_field_stats_hardening.sql): `sample_size`
 * is only populated for suppressed fields (n<10, exact — safe, see the
 * migration), `sample_size_band` only for unsuppressed ones ('10-19' /
 * '20-49' / '50+', never exact). This function mirrors that split:
 * `alumni_count` (exact) is only ever set for a suppressed entry,
 * `alumni_band` only for an unsuppressed one — a stored prediction row
 * must never carry an exact count for an unsuppressed field, or the
 * temporal-differencing channel the hardening closed on field_stats
 * reopens here instead (a signed-in attacker could submit the quiz
 * repeatedly and diff the "N of the 207 students…" sentence — see
 * components/results/ResultList.jsx).
 */
export function annotateRanked(ranked, statsRows) {
  const byField = new Map();
  for (const row of Array.isArray(statsRows) ? statsRows : []) {
    if (row && typeof row.field_of_study === 'string') {
      byField.set(row.field_of_study, row);
    }
  }
  return ranked.map(({ field, probability }) => {
    const stats = byField.get(field);
    const band =
      stats && typeof stats.sample_size_band === 'string' && stats.sample_size_band
        ? stats.sample_size_band
        : null;
    const exactCount = stats ? finiteNumberOrNull(stats.sample_size) : null;
    // A field with no stats row has nothing reportable — treat it as
    // suppressed rather than inventing zeros.
    const suppressed = stats ? stats.suppressed !== false : true;
    const entry = {
      field,
      probability,
      confidence: band ? (confidenceFromBand(band) ?? 'low') : confidenceTier(exactCount ?? 0),
      suppressed,
    };
    if (suppressed) {
      entry.alumni_count = exactCount ?? 0;
    } else if (band) {
      entry.alumni_band = band;
    }
    const sat = stats ? finiteNumberOrNull(stats.avg_satisfaction) : null;
    if (sat !== null) entry.avg_satisfaction = sat;
    const dis = stats ? finiteNumberOrNull(stats.pct_dissatisfied) : null;
    if (dis !== null) entry.pct_dissatisfied = dis;
    if (stats && typeof stats.common_preu === 'string' && stats.common_preu) {
      entry.common_preu = stats.common_preu;
    }
    return entry;
  });
}

/**
 * Absolute base URL for the ML service. A relative fetch does not work in
 * a route handler, so:
 *  - on Vercel, derive from VERCEL_URL (supplied bare — add the scheme);
 *  - locally, use ML_BASE_URL from the environment (e.g. the deployed
 *    service, or a locally running uvicorn);
 *  - otherwise fall back to the dev server origin, which only works when
 *    something is proxying /api/ml there.
 */
export function mlBaseUrl(env = process.env) {
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  if (env.ML_BASE_URL) return env.ML_BASE_URL.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

/** Shape-check the ML service's response before trusting it. */
export function isValidPrediction(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      Array.isArray(data.ranked) &&
      data.ranked.length > 0 &&
      data.ranked.every(
        (r) =>
          r &&
          typeof r.field === 'string' &&
          typeof r.probability === 'number' &&
          Number.isFinite(r.probability),
      ) &&
      typeof data.model_version === 'string' &&
      typeof data.marginalised === 'boolean',
  );
}
