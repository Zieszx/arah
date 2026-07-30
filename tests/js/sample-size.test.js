// lib/explore/sampleSize.js is the single place that reads the two
// mutually-exclusive columns field_stats hardening (0009) split
// sample_size into. These tests lock the rule an attacker would love to
// see slip: an unsuppressed field must never resolve to an exact number.
import { describe, it, expect } from 'vitest';
import {
  formatSampleSize,
  formatSampleSizeInSentence,
  sampleSizeSortWeight,
  confidenceFromBand,
} from '@/lib/explore/sampleSize.js';

describe('formatSampleSize', () => {
  it('renders a band with an en dash', () => {
    expect(formatSampleSize(null, '10-19')).toBe('10–19');
    expect(formatSampleSize(null, '20-49')).toBe('20–49');
  });

  it('50+ has no hyphen to convert and passes through unchanged', () => {
    expect(formatSampleSize(null, '50+')).toBe('50+');
  });

  it('falls back to the exact count only when no band is present', () => {
    expect(formatSampleSize(9, null)).toBe('9');
    expect(formatSampleSize(0, null)).toBe('0');
  });

  it('prefers the band over an exact count if both were somehow present', () => {
    // Should never happen from a real field_stats row (the two columns
    // are populated exclusively), but the band must win defensively —
    // exposing an exact count for an unsuppressed field is exactly the
    // channel 0009 closed.
    expect(formatSampleSize(44, '20-49')).toBe('20–49');
  });

  it('returns null rather than inventing a placeholder when neither is present', () => {
    expect(formatSampleSize(null, null)).toBeNull();
    expect(formatSampleSize(undefined, undefined)).toBeNull();
    expect(formatSampleSize('19', null)).toBeNull(); // not a real number — no coercion
  });
});

describe('sampleSizeSortWeight', () => {
  it('orders bands 50+ > 20-49 > 10-19', () => {
    const w = (band) => sampleSizeSortWeight(null, band);
    expect(w('50+')).toBeGreaterThan(w('20-49'));
    expect(w('20-49')).toBeGreaterThan(w('10-19'));
  });

  it('every banded (unsuppressed) row outranks every suppressed row', () => {
    const bandedMin = sampleSizeSortWeight(null, '10-19');
    const suppressedMax = sampleSizeSortWeight(9, null); // largest realistic suppressed count
    expect(bandedMin).toBeGreaterThan(suppressedMax);
  });

  it('suppressed rows sort by their exact (small, safe) count', () => {
    expect(sampleSizeSortWeight(9, null)).toBeGreaterThan(sampleSizeSortWeight(7, null));
  });

  it('never throws or NaNs on missing data', () => {
    expect(Number.isFinite(sampleSizeSortWeight(null, null))).toBe(true);
    expect(Number.isFinite(sampleSizeSortWeight(undefined, undefined))).toBe(true);
  });
});

describe('confidenceFromBand', () => {
  it('maps the two upper bands to high, the lowest to medium', () => {
    expect(confidenceFromBand('50+')).toBe('high');
    expect(confidenceFromBand('20-49')).toBe('high');
    expect(confidenceFromBand('10-19')).toBe('medium');
  });

  it('returns null for anything that is not a real band, never a guess', () => {
    expect(confidenceFromBand(null)).toBeNull();
    expect(confidenceFromBand(undefined)).toBeNull();
    expect(confidenceFromBand('9')).toBeNull();
    expect(confidenceFromBand('100+')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatSampleSizeInSentence — the prose form.
//
// formatSampleSize is right under a stat label, where "20–49" is unambiguous.
// Dropped into a sentence it produced "20–49 of the 207 students…", which
// reads as a subtraction before it reads as a range.
describe('formatSampleSizeInSentence', () => {
  it('spells a band out in words', () => {
    expect(formatSampleSizeInSentence(null, '10-19')).toBe('Between 10 and 19');
    expect(formatSampleSizeInSentence(null, '20-49')).toBe('Between 20 and 49');
  });

  it('says "More than 50" for the open-ended band', () => {
    // "Between 50 and +" would be nonsense.
    expect(formatSampleSizeInSentence(null, '50+')).toBe('More than 50');
  });

  it('leaves an exact count alone', () => {
    // "Between 9 and 9" would be absurd, and a range word around one number
    // implies an uncertainty that is not there.
    expect(formatSampleSizeInSentence(9, null)).toBe('9');
    expect(formatSampleSizeInSentence(0, null)).toBe('0');
  });

  it('prefers the band over an exact count, like its sibling', () => {
    // A row must never publish an exact count for an unsuppressed field.
    expect(formatSampleSizeInSentence(37, '20-49')).toBe('Between 20 and 49');
  });

  it('returns null when neither is available, so callers render nothing', () => {
    expect(formatSampleSizeInSentence(null, null)).toBeNull();
    expect(formatSampleSizeInSentence(undefined, undefined)).toBeNull();
    expect(formatSampleSizeInSentence(null, 'nonsense')).toBeNull();
  });

  it('reads correctly in the sentence it exists for', () => {
    const sentence = `${formatSampleSizeInSentence(null, '20-49')} of the 207 students that are most similar to you studied this.`;
    expect(sentence).toBe(
      'Between 20 and 49 of the 207 students that are most similar to you studied this.'
    );
  });
});
