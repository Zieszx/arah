import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { encodeAnswers, getSpec, validateAnswers } from '@/lib/features.js';

const fixtures = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'ml/parity_fixtures.json'), 'utf8'),
);

describe('feature spec', () => {
  it('matches the version the fixtures were generated from', () => {
    expect(getSpec().version).toBe(fixtures.spec_version);
  });

  it('declares 10 groups', () => {
    expect(getSpec().groups).toHaveLength(10);
  });
});

describe('JS/Python encoding parity', () => {
  it('declares the expected feature count', () => {
    expect(getSpec().n_features).toBe(55);
  });

  it.each(fixtures.cases.map((c, i) => [i, c]))(
    'case %i produces an identical vector to Python',
    (_i, testCase) => {
      expect(encodeAnswers(testCase.answers)).toEqual(testCase.vector);
    },
  );
});

describe('hostile numeric input handling (mirrors services/ml/encode.py)', () => {
  // speaking is the last group in the spec (a single 'num' slot), so its
  // encoded value is always the vector's final element.
  const lastOf = (answers) => {
    const vec = encodeAnswers(answers);
    return vec[vec.length - 1];
  };
  const speakingGroup = () => getSpec().groups.find((g) => g.key === 'speaking');

  it('clamps out-of-range finite numbers instead of extrapolating', () => {
    const g = speakingGroup();
    expect(lastOf({ speaking: 1_000_000_000 })).toBe(g.max / g.max);
    expect(lastOf({ speaking: -99 })).toBe(g.min / g.max);
  });

  it('never coerces strings, however numeric-looking', () => {
    for (const hostile of ['Infinity', '0x10', '0b101', '1_0', '٤', '３', 'inf', 'nan']) {
      expect(lastOf({ speaking: hostile })).toBe(0.6);
    }
  });

  it('does not treat booleans as numeric', () => {
    expect(lastOf({ speaking: true })).toBe(0.6);
  });

  it('skips non-string values in categorical sets instead of matching or crashing', () => {
    const personalityGroup = getSpec().groups.find((g) => g.key === 'personality');
    const start = getSpec().groups
      .slice(0, getSpec().groups.indexOf(personalityGroup))
      .reduce((n, g) => n + (g.type === 'num' ? 1 : g.options.length), 0);
    const slice = (answers) =>
      encodeAnswers(answers).slice(start, start + personalityGroup.options.length);

    expect(slice({ personality: { x: 1 } })).toEqual(personalityGroup.options.map(() => 0));
    expect(slice({ personality: [['x']] })).toEqual(personalityGroup.options.map(() => 0));
  });
});

describe('validateAnswers', () => {
  it('rejects more selections than max_select allows', () => {
    const stream = getSpec().groups.find((g) => g.key === 'stream');
    const tooMany = stream.options.slice(0, stream.max_select + 1);
    const res = validateAnswers({ stream: tooMany });
    expect(res.ok).toBe(false);
    expect(res.errors.stream).toMatch(/at most/i);
  });

  it('requires every non-optional group', () => {
    const res = validateAnswers({});
    expect(res.ok).toBe(false);
    expect(res.errors.preu).toBeUndefined(); // pre-U is optional
    expect(res.errors.stream).toBeDefined();
  });

  it('accepts a complete answer set', () => {
    const spec = getSpec();
    const answers = {};
    for (const g of spec.groups) {
      if (g.type === 'num') answers[g.key] = 3;
      else if (g.type === 'multi') answers[g.key] = [g.options[0]];
      else answers[g.key] = g.options[0];
    }
    expect(validateAnswers(answers).ok).toBe(true);
  });

  it('rejects an out-of-range or non-numeric speaking value', () => {
    expect(validateAnswers({ speaking: 1_000_000_000 }).errors.speaking).toBeDefined();
    expect(validateAnswers({ speaking: -99 }).errors.speaking).toBeDefined();
    expect(validateAnswers({ speaking: 'Infinity' }).errors.speaking).toBeDefined();
    expect(validateAnswers({ speaking: '3' }).errors.speaking).toBeDefined();
  });
});
