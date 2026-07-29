// The display-label layer is one-way: raw spec value in, corrected label
// out. These tests pin BOTH directions — the typo fixes render correctly,
// and the corrected spellings can never reach the model, because the
// encoder and validator only recognise the raw survey strings.
import { describe, it, expect } from 'vitest';
import { displayLabel, correctionEntries } from '@/lib/i18n/labels.js';
import { encodeAnswers, getSpec, validateAnswers } from '@/lib/features.js';

const spec = getSpec();

/** Every raw string the spec knows about: group options + class names. */
function allSpecStrings() {
  const out = [];
  for (const g of spec.groups) if (g.options) out.push(...g.options);
  out.push(...spec.classes);
  return out;
}

/**
 * A complete, valid answer set built from the spec itself — first option
 * of every categorical group (so `traits` includes whatever the spec's
 * first trait is), plus the numeric midpoint. Raw values only.
 */
function fullRawAnswers({ traits } = {}) {
  const answers = {};
  for (const g of spec.groups) {
    if (g.type === 'num') {
      answers[g.key] = g.min; // deliberately non-midpoint: a midpoint
      // encoding could pass by coincidence via the unanswered fallback.
      continue;
    }
    if (g.key === 'traits' && traits) {
      answers[g.key] = traits;
      continue;
    }
    answers[g.key] = g.type === 'multi' ? [g.options[0]] : g.options[0];
  }
  return answers;
}

/** Flat-vector index of a categorical option, walking the spec's order. */
function slotIndex(groupKey, option) {
  let i = 0;
  for (const g of spec.groups) {
    if (g.type === 'num') {
      if (g.key === groupKey) throw new Error('num groups have no options');
      i += 1;
      continue;
    }
    if (g.key === groupKey) return i + g.options.indexOf(option);
    i += g.options.length;
  }
  throw new Error(`unknown group ${groupKey}`);
}

describe('displayLabel corrections', () => {
  it("fixes the trait typo: 'Resiliant' → 'Resilient'", () => {
    expect(displayLabel('Resiliant')).toBe('Resilient');
  });

  it("fixes the class typo: 'Dentristry' → 'Dentistry', changing nothing else in the string", () => {
    const raw = 'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)';
    const shown = displayLabel(raw);
    expect(shown).toBe('Health & Medical Sciences (Medicine, Pharmacy, Dentistry etc)');
    expect(shown).not.toContain('Dentristry');
    // Only the typo moved — everything else is byte-identical.
    expect(shown.replace('Dentistry', 'Dentristry')).toBe(raw);
  });

  it('falls through unchanged for every other spec string and for unknowns', () => {
    const mapped = new Set(correctionEntries().map(([k]) => k));
    for (const s of allSpecStrings()) {
      if (mapped.has(s)) continue;
      expect(displayLabel(s)).toBe(s);
    }
    expect(displayLabel('Complete gibberish')).toBe('Complete gibberish');
    expect(displayLabel('')).toBe('');
  });

  it('every correction key is a live spec string (a fixed spec would orphan the map)', () => {
    const specStrings = new Set(allSpecStrings());
    for (const [rawKey, corrected] of correctionEntries()) {
      expect(specStrings.has(rawKey)).toBe(true);
      // ...and the corrected form must NOT be a valid spec string, or the
      // one-way guarantee below would be unverifiable.
      expect(specStrings.has(corrected)).toBe(false);
      expect(corrected).not.toBe(rawKey);
    }
  });
});

describe('the reverse direction can never happen (display labels are rejected by the model side)', () => {
  it('a full raw answer set still encodes to 55 features with the expected slots hot', () => {
    const answers = fullRawAnswers({ traits: ['Resiliant'] });
    expect(validateAnswers(answers).ok).toBe(true);

    const vec = encodeAnswers(answers);
    expect(vec).toHaveLength(spec.n_features);
    expect(vec).toHaveLength(55);

    // Every chosen categorical option is 1 in its own slot...
    for (const g of spec.groups) {
      if (g.type === 'num') continue;
      const chosen = Array.isArray(answers[g.key]) ? answers[g.key] : [answers[g.key]];
      for (const opt of chosen) expect(vec[slotIndex(g.key, opt)]).toBe(1);
    }
    // ...the raw typo's slot included.
    expect(vec[slotIndex('traits', 'Resiliant')]).toBe(1);
    // The numeric group encodes min/max, not the unanswered midpoint.
    const speaking = spec.groups.find((g) => g.key === 'speaking');
    expect(vec[vec.length - 1]).toBe(speaking.min / speaking.max);
  });

  it("the display spelling 'Resilient' is rejected by validation and inert in the encoder", () => {
    const answers = fullRawAnswers({ traits: ['Resilient'] });

    const { ok, errors } = validateAnswers(answers);
    expect(ok).toBe(false);
    expect(errors.traits).toBeDefined();

    const vec = encodeAnswers(answers);
    expect(vec[slotIndex('traits', 'Resiliant')]).toBe(0);
    // No trait slot lit at all — the display label matched nothing.
    const traitsGroup = spec.groups.find((g) => g.key === 'traits');
    for (const opt of traitsGroup.options) {
      expect(vec[slotIndex('traits', opt)]).toBe(0);
    }
  });

  it('every corrected display label is rejected wherever its raw value would be accepted', () => {
    for (const [rawKey, corrected] of correctionEntries()) {
      for (const g of spec.groups) {
        if (!g.options || !g.options.includes(rawKey)) continue;
        const withRaw = fullRawAnswers();
        const withDisplay = fullRawAnswers();
        withRaw[g.key] = g.type === 'multi' ? [rawKey] : rawKey;
        withDisplay[g.key] = g.type === 'multi' ? [corrected] : corrected;
        expect(validateAnswers(withRaw).ok).toBe(true);
        expect(validateAnswers(withDisplay).ok).toBe(false);
      }
    }
  });
});
