// lib/explore/pickQuotes.js picks a deterministic slice of the (unfiltered,
// field-less) advice_quotes pool per field slug. Deterministic matters here
// for two reasons: stable screenshots/tests, and — the actual privacy
// guarantee — the function only ever receives the flat, unfiltered quote
// list, so there is no way for it to leak a "these N quotes belong to this
// field" association even if it wanted to.
import { describe, it, expect } from 'vitest';
import { pickQuotes } from '@/lib/explore/pickQuotes.js';

const QUOTES = Array.from({ length: 10 }, (_, i) => `quote ${i}`);

describe('pickQuotes', () => {
  it('returns n quotes for a given seed', () => {
    expect(pickQuotes(QUOTES, 'business-management', 3)).toHaveLength(3);
  });

  it('is deterministic: same seed, same list, same result every call', () => {
    const a = pickQuotes(QUOTES, 'engineering', 3);
    const b = pickQuotes(QUOTES, 'engineering', 3);
    expect(a).toEqual(b);
  });

  it('different seeds tend to select different slices', () => {
    const a = pickQuotes(QUOTES, 'business-management', 3);
    const b = pickQuotes(QUOTES, 'law-legal-studies', 3);
    expect(a).not.toEqual(b);
  });

  it('every returned quote actually came from the input list', () => {
    const picked = pickQuotes(QUOTES, 'media-communication', 4);
    for (const q of picked) expect(QUOTES).toContain(q);
  });

  it('caps at the list length rather than repeating when n exceeds it', () => {
    const picked = pickQuotes(['only one'], 'x', 5);
    expect(picked).toEqual(['only one']);
  });

  it('returns an empty array for an empty or missing list, never throws', () => {
    expect(pickQuotes([], 'x', 3)).toEqual([]);
    expect(pickQuotes(null, 'x', 3)).toEqual([]);
    expect(pickQuotes(undefined, 'x', 3)).toEqual([]);
  });
});
