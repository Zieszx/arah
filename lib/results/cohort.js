// How many alumni a prediction was made against.
//
// This is the denominator in the single most important sentence on the
// results page — "44 of the 207 students most like you studied this" — and it
// was being computed wrongly in a way that produced arithmetic nonsense:
//
//   "20–49 of the 16 students most like you studied this."
//
// The old code summed `alumni_count` across the ranked entries. That was
// correct when every entry carried an exact count, and silently stopped being
// correct after the k-anonymity hardening (0009), which removed the exact
// count from every UNSUPPRESSED field and replaced it with a band. What was
// left to sum was only the two suppressed fields — 9 + 7 — so the page claimed
// a cohort of 16, and incidentally published the sum of the two withheld
// counts, which is precisely the sort of arithmetic that suppression exists to
// prevent.
//
// The cohort is not derivable from the ranked entries any more, so it is read
// from the place that actually knows it: the model's own class counts. That
// number is already public everywhere else on the site.

/**
 * @param results  the stored `results` object ({ ranked, cohort_size? })
 * @param spec     services/ml/feature_spec.json
 * @returns a positive integer, or null when it cannot be known — callers must
 *          render nothing rather than a wrong or invented number.
 */
export function cohortSize(results, spec) {
  // 1. A prediction that recorded its own cohort wins. Rows written before
  //    this existed carry nothing, but every new one does
  //    (app/api/questions/route.js), so an old link keeps stating the n it
  //    was actually computed from even after a retrain changes the corpus.
  const stored = positiveInt(results?.cohort_size);
  if (stored !== null) return stored;

  // 2. Otherwise the model's training cohort. Exact, already public, and
  //    correct for every prediction made by this model version.
  const counts = spec?.class_counts;
  if (counts && typeof counts === 'object') {
    let sum = 0;
    for (const value of Object.values(counts)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        sum += value;
      }
    }
    if (sum > 0) return sum;
  }

  // 3. Deliberately not a guess. Summing what is left of alumni_count is
  //    exactly the bug this module replaced.
  return null;
}

/** A stored value only counts if it is genuinely a positive whole number. */
function positiveInt(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

/**
 * The cohort to stamp on a NEW prediction, from the spec that produced it.
 * Returns null if the spec cannot supply one, in which case nothing is
 * stamped and the reader falls back to the spec at render time.
 */
export function cohortSizeFromSpec(spec) {
  return cohortSize(null, spec);
}
