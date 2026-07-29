// Pure logic behind POST /api/quiz: payload cleaning, confidence tiers,
// field_stats annotation, and the ML base-URL derivation. The route
// handler itself is glue over these and is verified live.
import { describe, it, expect } from 'vitest';
import {
  annotateRanked,
  cleanAnswers,
  confidenceTier,
  finiteNumberOrNull,
  isValidPrediction,
  mlBaseUrl,
} from '@/lib/quiz/submission.js';
import { getSpec } from '@/lib/features.js';

describe('confidenceTier', () => {
  it('high ≥ 20, medium 10–19, low < 10 — exact boundaries', () => {
    expect(confidenceTier(20)).toBe('high');
    expect(confidenceTier(44)).toBe('high');
    expect(confidenceTier(19)).toBe('medium');
    expect(confidenceTier(10)).toBe('medium');
    expect(confidenceTier(9)).toBe('low');
    expect(confidenceTier(0)).toBe('low');
  });

  it('treats garbage counts as low, never NaN', () => {
    for (const junk of [null, undefined, '', 'ten', [], {}, NaN]) {
      expect(confidenceTier(junk)).toBe('low');
    }
    // Negative control: a numeric string is a real count, not garbage —
    // if strict parsing ever broke, this line goes red before production.
    expect(confidenceTier('21')).toBe('high');
  });
});

describe('finiteNumberOrNull', () => {
  it('never falls for the Number() coercion traps that bit this project', () => {
    expect(finiteNumberOrNull('')).toBeNull(); // Number('') === 0
    expect(finiteNumberOrNull(null)).toBeNull(); // Number(null) === 0
    expect(finiteNumberOrNull([5])).toBeNull(); // Number([5]) === 5
    expect(finiteNumberOrNull(true)).toBeNull();
    expect(finiteNumberOrNull('  ')).toBeNull();
    expect(finiteNumberOrNull(Infinity)).toBeNull();
    expect(finiteNumberOrNull('4.13')).toBe(4.13);
    expect(finiteNumberOrNull(7)).toBe(7);
  });
});

describe('cleanAnswers', () => {
  it('omits an absent preu entirely — never defaults it, never sends ""', () => {
    const cleaned = cleanAnswers({ school: 'Private School' });
    expect('preu' in cleaned).toBe(false);
    expect(cleanAnswers({ preu: '' })).toEqual({});
    expect(cleanAnswers({ preu: null })).toEqual({});
    expect(cleanAnswers({ preu: undefined })).toEqual({});
  });

  it('keeps a stated preu untouched', () => {
    expect(cleanAnswers({ preu: 'Foundation' })).toEqual({ preu: 'Foundation' });
  });

  it('strips keys the spec does not know', () => {
    const cleaned = cleanAnswers({
      school: 'Private School',
      __proto__pollution: 'x',
      admin: true,
      giant_blob: 'y'.repeat(100),
    });
    expect(Object.keys(cleaned)).toEqual(['school']);
  });

  it('drops empty arrays but keeps populated ones', () => {
    expect(cleanAnswers({ traits: [] })).toEqual({});
    expect(cleanAnswers({ traits: ['Analytical'] })).toEqual({ traits: ['Analytical'] });
  });

  it('returns {} for non-object payloads instead of crashing', () => {
    for (const junk of [null, undefined, 'answers', 42, ['a']]) {
      expect(cleanAnswers(junk)).toEqual({});
    }
  });
});

describe('annotateRanked', () => {
  const ranked = [
    { field: 'Business & Management (Accounting, Finance, Marketing etc)', probability: 0.5 },
    { field: 'Creative Art (Fashion Design, Interior Design etc)', probability: 0.3 },
    { field: 'Media & Communication', probability: 0.2 },
  ];
  const stats = [
    {
      field_of_study: 'Business & Management (Accounting, Finance, Marketing etc)',
      sample_size: 44,
      avg_satisfaction: 4.11,
      pct_dissatisfied: 4.5,
      common_preu: 'Diploma',
      suppressed: false,
    },
    {
      // Suppressed row: aggregates arrive as NULL below the k-threshold.
      field_of_study: 'Creative Art (Fashion Design, Interior Design etc)',
      sample_size: 9,
      avg_satisfaction: null,
      pct_dissatisfied: null,
      common_preu: null,
      suppressed: true,
    },
    // Media & Communication deliberately missing entirely.
  ];

  it('annotates each field with alumni_count and its tier', () => {
    const out = annotateRanked(ranked, stats);
    expect(out[0]).toMatchObject({
      alumni_count: 44,
      confidence: 'high',
      suppressed: false,
      avg_satisfaction: 4.11,
      pct_dissatisfied: 4.5,
      common_preu: 'Diploma',
    });
    expect(out[1]).toMatchObject({ alumni_count: 9, confidence: 'low', suppressed: true });
    expect(out[2]).toMatchObject({ alumni_count: 0, confidence: 'low', suppressed: true });
  });

  it('never stores null or NaN for a suppressed aggregate — the key is omitted', () => {
    const out = annotateRanked(ranked, stats);
    for (const entry of out.slice(1)) {
      expect('avg_satisfaction' in entry).toBe(false);
      expect('pct_dissatisfied' in entry).toBe(false);
      expect('common_preu' in entry).toBe(false);
    }
    const json = JSON.stringify(out);
    expect(json).not.toContain('null');
    expect(json).not.toContain('NaN');
  });

  it('keeps probabilities and order untouched', () => {
    const out = annotateRanked(ranked, stats);
    expect(out.map((e) => e.field)).toEqual(ranked.map((r) => r.field));
    expect(out.map((e) => e.probability)).toEqual([0.5, 0.3, 0.2]);
  });

  it('handles a banded/stringly sample_size without coercion accidents', () => {
    const out = annotateRanked(
      [{ field: 'X', probability: 1 }],
      [{ field_of_study: 'X', sample_size: '19', suppressed: false }],
    );
    expect(out[0].alumni_count).toBe(19);
    expect(out[0].confidence).toBe('medium');
    const empty = annotateRanked(
      [{ field: 'X', probability: 1 }],
      [{ field_of_study: 'X', sample_size: '', suppressed: true }],
    );
    expect(empty[0].alumni_count).toBe(0); // Number('') === 0 must not sneak a count in
    expect(empty[0].confidence).toBe('low');
  });

  it('survives missing stats entirely', () => {
    for (const junk of [null, undefined, [], 'rows']) {
      const out = annotateRanked(ranked, junk);
      expect(out).toHaveLength(3);
      for (const e of out) expect(e.confidence).toBe('low');
    }
  });
});

describe('mlBaseUrl', () => {
  it('derives from VERCEL_URL, adding the scheme Vercel omits', () => {
    expect(mlBaseUrl({ VERCEL_URL: 'arah-abc123.vercel.app' })).toBe(
      'https://arah-abc123.vercel.app',
    );
  });

  it('VERCEL_URL wins over a configured base', () => {
    expect(
      mlBaseUrl({ VERCEL_URL: 'arah.vercel.app', ML_BASE_URL: 'http://localhost:8000' }),
    ).toBe('https://arah.vercel.app');
  });

  it('falls back to ML_BASE_URL locally, trimming trailing slashes', () => {
    expect(mlBaseUrl({ ML_BASE_URL: 'https://arah-sand.vercel.app/' })).toBe(
      'https://arah-sand.vercel.app',
    );
    expect(mlBaseUrl({})).toBe('http://localhost:3000');
  });
});

describe('isValidPrediction', () => {
  const good = {
    ranked: getSpec().classes.map((field, i) => ({ field, probability: i === 0 ? 1 : 0 })),
    model_version: '2026-07-28',
    marginalised: false,
  };

  it('accepts the ML service contract', () => {
    expect(isValidPrediction(good)).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isValidPrediction(null)).toBe(false);
    expect(isValidPrediction({})).toBe(false);
    expect(isValidPrediction({ ...good, ranked: [] })).toBe(false);
    expect(isValidPrediction({ ...good, marginalised: 'yes' })).toBe(false);
    expect(isValidPrediction({ ...good, model_version: 3 })).toBe(false);
    expect(
      isValidPrediction({ ...good, ranked: [{ field: 'X', probability: 'high' }] }),
    ).toBe(false);
    expect(
      isValidPrediction({ ...good, ranked: [{ field: 'X', probability: NaN }] }),
    ).toBe(false);
  });
});
