// Single source of truth for reading the k-anonymity-hardened shape of
// field_stats (supabase/migrations/0009_field_stats_hardening.sql).
//
// Why this file exists: before 0009, every consumer read a plain exact
// `sample_size` integer. 0009 splits that into two columns —
//   - `sample_size`       exact, populated ONLY when a field is suppressed
//                          (n < 10). Below the k-anonymity threshold no
//                          per-person aggregate is ever derived from the
//                          row, so an exact count leaks nothing (see the
//                          migration's header comment).
//   - `sample_size_band`  one of '10-19' | '20-49' | '50+', populated ONLY
//                          when a field is NOT suppressed. Never an exact
//                          number here — that was the temporal-differencing
//                          channel Plan 1's review found (poll before/after
//                          one contribution, the delta is that student's
//                          exact satisfaction score).
// Every screen that shows a sample size (or derives a confidence tier from
// one) must go through these helpers rather than reading either column
// directly, so the "which column means what" rule can only ever live in
// one place.
export const SAMPLE_SIZE_BAND_ORDER = { '10-19': 1, '20-49': 2, '50+': 3 };

// The band boundaries are not arbitrary: they are exactly the confidence
// tier thresholds already used by lib/quiz/submission.js#confidenceTier
// and components/arah/ConfidenceBadge.jsx (>=20 high, >=10 medium). A band
// is therefore always resolvable to a tier with no exact count needed.
const BAND_TIER = { '50+': 'high', '20-49': 'high', '10-19': 'medium' };

function isBand(v) {
  return typeof v === 'string' && v in SAMPLE_SIZE_BAND_ORDER;
}

function isExact(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Human-readable sample size for display. Renders the band with an en
 * dash ('10–19') when present, else the exact count (suppressed fields
 * only). Returns null when neither is available — callers must not
 * invent a placeholder for that case.
 */
export function formatSampleSize(sampleSize, sampleSizeBand) {
  if (isBand(sampleSizeBand)) return sampleSizeBand.replace('-', '–');
  if (isExact(sampleSize)) return String(sampleSize);
  return null;
}

/**
 * The same sample size as a fragment that reads inside a sentence.
 *
 * `formatSampleSize` is right for a stat block, where "20–49" sits under a
 * label and is unambiguous. Dropped into prose it produced "20–49 of the 207
 * students…", which reads as a subtraction before it reads as a range. This
 * spells the range out instead: "Between 20 and 49 of the 207 students…".
 *
 * An exact count (suppressed fields only) is returned unchanged — "Between 9
 * and 9" would be absurd, and a range word around a single number would imply
 * an uncertainty that is not there.
 *
 * '50+' becomes "More than 50" rather than "Between 50 and +".
 */
export function formatSampleSizeInSentence(sampleSize, sampleSizeBand) {
  if (isBand(sampleSizeBand)) {
    if (sampleSizeBand === '50+') return 'More than 50';
    const [low, high] = sampleSizeBand.split('-');
    return `Between ${low} and ${high}`;
  }
  if (isExact(sampleSize)) return String(sampleSize);
  return null;
}

/**
 * Sort weight for "largest sample first" listings (e.g. /explore). Never
 * derived from an exact unsuppressed count — that would just be the
 * banded value's hidden precursor. Banded rows always outrank suppressed
 * (exact, always < 10) rows; ties within a band or among suppressed rows
 * fall back to alphabetical ordering at the call site.
 */
export function sampleSizeSortWeight(sampleSize, sampleSizeBand) {
  if (isBand(sampleSizeBand)) return 100 + SAMPLE_SIZE_BAND_ORDER[sampleSizeBand];
  if (isExact(sampleSize)) return sampleSize;
  return -1;
}

/**
 * Confidence tier ('high' | 'medium') from a band string, or null if the
 * band is missing/unrecognised — callers fall back to their own
 * suppressed-path tiering (always 'low') in that case.
 */
export function confidenceFromBand(sampleSizeBand) {
  return isBand(sampleSizeBand) ? BAND_TIER[sampleSizeBand] : null;
}
