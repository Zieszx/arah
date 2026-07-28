/**
 * JavaScript mirror of api/ml/encode.py.
 *
 * The encoding logic exists in two languages because the quiz renders in the
 * browser and inference runs in Python. They are held in lockstep by
 * ml/parity_fixtures.json — if these two ever disagree, tests/js/features.test.js
 * fails. Never edit this file without re-running `python ml/train.py`.
 */
import spec from '@/ml/feature_spec.json' with { type: 'json' };

export function getSpec() {
  return spec;
}

export function getGroups() {
  return spec.groups;
}

/** Answers object -> flat number[], ordered by spec.groups. */
export function encodeAnswers(answers = {}) {
  const vec = [];
  for (const g of spec.groups) {
    if (g.type === 'num') {
      const rawVal = answers[g.key];
      const raw = rawVal === null || rawVal === undefined ? NaN : Number(rawVal);
      const val = Number.isFinite(raw) ? raw : (g.min + g.max) / 2;
      vec.push(round10(val / g.max));
      continue;
    }
    const raw = answers[g.key];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const selected = new Set(list.filter(Boolean));
    for (const opt of g.options) vec.push(selected.has(opt) ? 1 : 0);
  }
  return vec;
}

/** Mirrors Python's round(x, 10) so the parity fixtures compare exactly. */
function round10(n) {
  return Number(n.toFixed(10));
}

export function validateAnswers(answers = {}) {
  const errors = {};
  for (const g of spec.groups) {
    const raw = answers[g.key];

    if (g.type === 'num') {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < g.min || n > g.max) {
        errors[g.key] = `Choose a value between ${g.min} and ${g.max}.`;
      }
      continue;
    }

    const list = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];

    if (list.length === 0) {
      if (!g.optional) errors[g.key] = 'Please answer this question.';
      continue;
    }
    if (g.max_select && list.length > g.max_select) {
      errors[g.key] = `Choose at most ${g.max_select}.`;
      continue;
    }
    if (g.type === 'single' && list.length > 1) {
      errors[g.key] = 'Choose one option.';
      continue;
    }
    const unknown = list.filter((v) => !g.options.includes(v));
    if (unknown.length) errors[g.key] = `Unrecognised option: ${unknown[0]}`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
