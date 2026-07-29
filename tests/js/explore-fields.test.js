// lib/explore/fields.js is the single source of truth for the field<->slug
// mapping used by /explore, /explore/[field] and (per the Plan 4 task
// brief) Plan 5's admin. These tests pin the properties that matter for a
// URL: every slug is unique, URL-safe, deterministic across runs, and the
// one genuine survey typo ("Dentristry") never leaks into a slug (slugs are
// derived from the class name with its parenthetical detail stripped, and
// the typo only ever appears inside that parenthetical).
import { describe, it, expect } from 'vitest';
import { FIELDS, getFieldRawBySlug, getSlugForField } from '@/lib/explore/fields.js';
import featureSpec from '@/services/ml/feature_spec.json';

describe('FIELDS', () => {
  it('has exactly the ten classes from feature_spec.json, in order', () => {
    expect(FIELDS.map((f) => f.raw)).toEqual(featureSpec.classes);
    expect(FIELDS).toHaveLength(10);
  });

  it('every slug is unique', () => {
    const slugs = FIELDS.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every slug is URL-safe: lowercase letters, digits and hyphens only, no leading/trailing hyphen', () => {
    for (const { slug } of FIELDS) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('the survey typo never appears in a slug', () => {
    for (const { slug } of FIELDS) {
      expect(slug).not.toContain('dentristry');
    }
    const health = FIELDS.find((f) => f.raw.includes('Dentristry'));
    expect(health.slug).toBe('health-medical-sciences');
  });

  it('slugification is stable and deterministic — recomputing yields the same mapping', () => {
    const again = featureSpec.classes.map(
      (raw) => FIELDS.find((f) => f.raw === raw).slug
    );
    expect(again).toEqual(FIELDS.map((f) => f.slug));
  });
});

describe('getFieldRawBySlug / getSlugForField', () => {
  it('round-trips every known field', () => {
    for (const { raw, slug } of FIELDS) {
      expect(getFieldRawBySlug(slug)).toBe(raw);
      expect(getSlugForField(raw)).toBe(slug);
    }
  });

  it('returns null for an unknown slug or field — never throws, never guesses', () => {
    expect(getFieldRawBySlug('not-a-real-field')).toBeNull();
    expect(getFieldRawBySlug('')).toBeNull();
    expect(getSlugForField('Made Up Field')).toBeNull();
  });
});
