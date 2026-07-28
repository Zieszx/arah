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
});
