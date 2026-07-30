// The denominator in the results page's headline sentence.
//
// This shipped wrong and read as arithmetic nonsense:
//
//   "20–49 of the 16 students most like you studied this."
//
// The page summed `alumni_count` across the ranked entries. That was right
// while every entry carried an exact count, and quietly stopped being right
// after the k-anonymity hardening removed the exact count from every
// UNSUPPRESSED field. What remained to sum was the two suppressed fields —
// 9 + 7 — so the page claimed a cohort of 16 AND published the sum of the two
// withheld counts, which is exactly the arithmetic suppression exists to stop.
//
// Nothing failed. The number was simply wrong on the most important sentence
// in the product, and only a human reading it noticed.
import { describe, it, expect } from 'vitest';
import { cohortSize, cohortSizeFromSpec } from '@/lib/results/cohort';
import realSpec from '@/services/ml/feature_spec.json';

// The shape a stored prediction actually has today: bands for unsuppressed
// fields, exact counts only for the two suppressed ones.
const STORED = {
  ranked: [
    { field: 'Business & Management', probability: 0.66, alumni_band: '20-49' },
    { field: 'Computer Science', probability: 0.16, alumni_band: '20-49' },
    { field: 'Creative Art', probability: 0.02, alumni_count: 9 },
    { field: 'Humanities & Social Sciences', probability: 0.01, alumni_count: 7 },
  ],
};

const SPEC = { class_counts: { A: 100, B: 60, C: 40, D: 7 } };

describe('cohortSize', () => {
  it('does NOT sum the surviving alumni_count values', () => {
    // The regression itself. 9 + 7 = 16 must never be the answer.
    expect(cohortSize(STORED, SPEC)).not.toBe(16);
    expect(cohortSize(STORED, SPEC)).toBe(207);
  });

  it('falls back to the spec cohort for a row that predates the stamp', () => {
    expect(cohortSize(STORED, SPEC)).toBe(207);
  });

  it('prefers a cohort stamped on the prediction itself', () => {
    // An old link must keep stating the n it was computed against, even after
    // a retrain moves the spec.
    const stamped = { ...STORED, cohort_size: 207 };
    expect(cohortSize(stamped, { class_counts: { A: 999 } })).toBe(207);
  });

  it('returns null rather than a guess when nothing can supply the cohort', () => {
    // Callers render nothing on null. A wrong denominator is worse than a
    // missing sentence — that is the whole lesson of this bug.
    expect(cohortSize(STORED, null)).toBeNull();
    expect(cohortSize(STORED, {})).toBeNull();
    expect(cohortSize(STORED, { class_counts: {} })).toBeNull();
    expect(cohortSize(null, null)).toBeNull();
  });

  it('ignores a stamped value that is not a positive number', () => {
    for (const bad of [0, -5, Number.NaN, '207', null, undefined, {}]) {
      const row = { ...STORED, cohort_size: bad };
      // Falls through to the spec rather than trusting the junk.
      expect(cohortSize(row, SPEC)).toBe(207);
    }
  });

  it('ignores non-numeric or negative class counts', () => {
    const messy = { class_counts: { A: 100, B: '50', C: -10, D: null, E: 7 } };
    expect(cohortSize(STORED, messy)).toBe(107);
  });

  it('rounds a stamped fractional value rather than showing a decimal', () => {
    expect(cohortSize({ ...STORED, cohort_size: 206.6 }, SPEC)).toBe(207);
  });
});

describe('against the real shipped spec', () => {
  it('reports the cohort the product states everywhere else', () => {
    // If this ever disagrees with the "207 alumni" on the landing page, one
    // of the two is lying to a student.
    expect(cohortSizeFromSpec(realSpec)).toBe(207);
  });

  it('matches the sum of the real class counts exactly', () => {
    const sum = Object.values(realSpec.class_counts).reduce((a, b) => a + b, 0);
    expect(cohortSizeFromSpec(realSpec)).toBe(sum);
  });
});
