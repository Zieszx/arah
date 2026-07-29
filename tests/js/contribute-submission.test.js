// Pure logic behind POST /api/contribute. The most important guarantee in
// this file is the one the security review demanded: no caller, however
// crafted, can make mapContributionToRow return verified: true.
import { describe, it, expect } from 'vitest';
import {
  ADVICE_MAX_LENGTH,
  ADVICE_MIN_LENGTH,
  cleanContribution,
  mapContributionToRow,
  outcomeGroups,
  REASONS_MAX_SELECT,
  REASONS_OPTIONS,
  validateContribution,
} from '@/lib/contribute/submission.js';
import { getSpec } from '@/lib/features.js';

const spec = getSpec();

/** A complete, valid contribution: first option of every group, real advice. */
function fullValidAnswers() {
  const answers = {};
  for (const g of spec.groups) {
    if (g.type === 'num') {
      answers[g.key] = g.min;
      continue;
    }
    answers[g.key] = g.type === 'multi' ? [g.options[0]] : g.options[0];
  }
  answers.field_of_study = spec.classes[0];
  answers.reasons = [REASONS_OPTIONS[0]];
  answers.satisfaction = 4;
  answers.advice =
    'Talk to seniors already in the field before committing, and pick something you would still choose without the salary.';
  return answers;
}

describe('outcomeGroups', () => {
  it('field_of_study options are exactly feature_spec.json\'s classes', () => {
    const g = outcomeGroups().find((x) => x.key === 'field_of_study');
    expect(g.options).toEqual(spec.classes);
  });

  it('reasons allows up to REASONS_MAX_SELECT from REASONS_OPTIONS', () => {
    const g = outcomeGroups().find((x) => x.key === 'reasons');
    expect(g.max_select).toBe(REASONS_MAX_SELECT);
    expect(g.options).toEqual(REASONS_OPTIONS);
  });

  it('satisfaction is a 1-5 numeric group', () => {
    const g = outcomeGroups().find((x) => x.key === 'satisfaction');
    expect(g.type).toBe('num');
    expect(g.min).toBe(1);
    expect(g.max).toBe(5);
  });
});

describe('cleanContribution', () => {
  it('drops unknown keys and empty values, keeps everything real', () => {
    const cleaned = cleanContribution({
      school: 'Private School',
      __proto__pollution: 'x',
      verified: true, // MUST be dropped — not a recognised key at all
      reasons: [],
      advice: '   ',
    });
    expect(cleaned).toEqual({ school: 'Private School' });
  });

  it('trims advice', () => {
    expect(cleanContribution({ advice: '  Choose wisely.  ' }).advice).toBe('Choose wisely.');
  });

  it('returns {} for non-object payloads instead of crashing', () => {
    for (const junk of [null, undefined, 'x', 42, ['a']]) {
      expect(cleanContribution(junk)).toEqual({});
    }
  });
});

describe('validateContribution', () => {
  it('accepts a fully-answered, honest contribution', () => {
    const { ok, errors } = validateContribution(fullValidAnswers());
    expect(ok).toBe(true);
    expect(errors).toEqual({});
  });

  it('requires preu even though the quiz spec marks it optional — a contributor already knows their route', () => {
    const answers = fullValidAnswers();
    delete answers.preu;
    const { ok, errors } = validateContribution(answers);
    expect(ok).toBe(false);
    expect(errors.preu).toBeDefined();
  });

  it('still rejects a garbage preu value with its own message, not silently accepting it', () => {
    const answers = fullValidAnswers();
    answers.preu = 'Not a real route';
    const { ok, errors } = validateContribution(answers);
    expect(ok).toBe(false);
    expect(errors.preu).toBeDefined();
  });

  it('rejects an unrecognised field_of_study', () => {
    const answers = fullValidAnswers();
    answers.field_of_study = 'Made Up Field';
    expect(validateContribution(answers).errors.field_of_study).toBeDefined();
  });

  it('rejects zero reasons and more than the max', () => {
    const answers = fullValidAnswers();
    answers.reasons = [];
    expect(validateContribution(answers).errors.reasons).toBeDefined();

    answers.reasons = REASONS_OPTIONS.slice(0, REASONS_MAX_SELECT + 1);
    expect(validateContribution(answers).errors.reasons).toBeDefined();
  });

  it('rejects an unrecognised reason', () => {
    const answers = fullValidAnswers();
    answers.reasons = ['Not a real reason'];
    expect(validateContribution(answers).errors.reasons).toBeDefined();
  });

  it('rejects satisfaction outside 1-5 and non-integers', () => {
    for (const bad of [0, 6, 3.5, '4', null, undefined, NaN]) {
      const answers = fullValidAnswers();
      answers.satisfaction = bad;
      expect(validateContribution(answers).errors.satisfaction).toBeDefined();
    }
  });

  it('rejects advice that is too short, too long, or whitespace-only', () => {
    const short = fullValidAnswers();
    short.advice = 'too short';
    expect(validateContribution(short).errors.advice).toBeDefined();

    const blank = fullValidAnswers();
    blank.advice = '   ';
    expect(validateContribution(blank).errors.advice).toBeDefined();

    const long = fullValidAnswers();
    long.advice = 'x'.repeat(ADVICE_MAX_LENGTH + 1);
    expect(validateContribution(long).errors.advice).toBeDefined();
  });

  it('accepts advice at exactly the boundaries', () => {
    const min = fullValidAnswers();
    min.advice = 'x'.repeat(ADVICE_MIN_LENGTH);
    expect(validateContribution(min).ok).toBe(true);

    const max = fullValidAnswers();
    max.advice = 'x'.repeat(ADVICE_MAX_LENGTH);
    expect(validateContribution(max).ok).toBe(true);
  });

  it('reports every offending field at once, not just the first', () => {
    const { errors } = validateContribution({});
    expect(Object.keys(errors).length).toBeGreaterThan(5);
    expect(errors.field_of_study).toBeDefined();
    expect(errors.reasons).toBeDefined();
    expect(errors.satisfaction).toBeDefined();
    expect(errors.advice).toBeDefined();
  });
});

describe('mapContributionToRow', () => {
  it('forces verified: false and source: user_contributed no matter what the input claims', () => {
    const answers = fullValidAnswers();
    // A crafted client payload trying to sneak these through.
    answers.verified = true;
    answers.source = 'survey_2025';
    const row = mapContributionToRow(answers);
    expect(row.verified).toBe(false);
    expect(row.source).toBe('user_contributed');
  });

  it('maps every predictive answer to its alumni_profiles column', () => {
    const answers = fullValidAnswers();
    const row = mapContributionToRow(answers);
    expect(row.school_type).toBe(answers.school);
    expect(row.spm_results).toBe(answers.results);
    expect(row.streams).toEqual(answers.stream);
    expect(row.subjects_enjoyed).toEqual(answers.enjoyed);
    expect(row.subjects_difficult).toEqual(answers.difficult);
    expect(row.tasks_enjoyed).toEqual(answers.tasks);
    expect(row.characteristics).toEqual(answers.traits);
    expect(row.personality).toBe(answers.personality);
    expect(row.public_speaking).toBe(answers.speaking);
    expect(row.preu_program).toBe(answers.preu);
  });

  it('maps every outcome answer, trimming advice', () => {
    const answers = fullValidAnswers();
    answers.advice = '  trimmed?  and this is long enough to pass validation.  ';
    const row = mapContributionToRow(answers);
    expect(row.field_of_study).toBe(answers.field_of_study);
    expect(row.reasons).toEqual(answers.reasons);
    expect(row.satisfaction).toBe(answers.satisfaction);
    expect(row.advice).toBe('trimmed?  and this is long enough to pass validation.');
  });

  it('never lets an absent array answer become anything but []', () => {
    const row = mapContributionToRow({});
    expect(row.streams).toEqual([]);
    expect(row.subjects_enjoyed).toEqual([]);
    expect(row.reasons).toEqual([]);
  });
});
