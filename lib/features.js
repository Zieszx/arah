/**
 * JavaScript mirror of services/ml/encode.py.
 *
 * The encoding logic exists in two languages because the quiz renders in the
 * browser and inference runs in Python. They are held in lockstep by
 * ml/parity_fixtures.json — if these two ever disagree, tests/js/features.test.js
 * fails. Never edit this file without re-running `python ml/train.py`.
 */
import spec from '../services/ml/feature_spec.json' with { type: 'json' };

export function getSpec() {
  return spec;
}

export function getGroups() {
  return spec.groups;
}

/**
 * Coerce a raw numeric answer to a finite number, or NaN if it should be
 * treated as "not answered". Deliberately strict — no string coercion at
 * all — because loose coercion (`Number("0x10")`, `Number("1_0")`, etc.)
 * accepts a *different* set of strings than Python's `float()`, so any
 * string-parsing path here inevitably drifts from the Python encoder on
 * some input. Accepting only an actual `number` primitive (never a string,
 * array, boolean, null, or undefined) is the one rule both sides can share
 * exactly, so both fall back to the same midpoint default for anything
 * else.
 */
function toStrictNumberOrNaN(rawVal) {
  return typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : NaN;
}

/**
 * Answers object -> flat number[], ordered by spec.groups.
 *
 * Numeric groups accept only a finite `number`; anything else falls back to
 * the midpoint, and any accepted value is clamped to [min, max]. Categorical
 * groups only ever add `string` values to the selected set, so a dict/array/
 * number passed as an answer is inert rather than corrupting the vector.
 */
export function encodeAnswers(answers = {}) {
  const vec = [];
  for (const g of spec.groups) {
    if (g.type === 'num') {
      const raw = toStrictNumberOrNaN(answers[g.key]);
      const val = Number.isFinite(raw) ? raw : (g.min + g.max) / 2;
      const clamped = Math.min(Math.max(val, g.min), g.max);
      vec.push(round10(clamped / g.max));
      continue;
    }
    const raw = answers[g.key];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const selected = new Set(list.filter((x) => typeof x === 'string' && x));
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
      const n = toStrictNumberOrNaN(raw);
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
