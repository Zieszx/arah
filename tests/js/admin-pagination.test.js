// Unit tests for lib/admin/pagination.js — the paging arithmetic behind
// every admin table.
//
// Every input here arrives from a query string, so the interesting cases are
// the hostile ones. A page of "-1" or "1e9" must not reach Postgres as a
// negative offset, and clampPage exists because .range() past the end of a
// filtered result returns an empty array rather than an error — the screen
// would then claim there are no matches when there plainly are.
import { describe, it, expect } from 'vitest';
import {
  parsePageParams,
  pageCount,
  rangeFor,
  clampPage,
  pageHref,
  paginationWindow,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from '@/lib/admin/pagination';

describe('parsePageParams — hostile query strings', () => {
  it('defaults when nothing is supplied', () => {
    expect(parsePageParams({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(parsePageParams(undefined)).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('reads a plain page number', () => {
    expect(parsePageParams({ page: '4' }).page).toBe(4);
  });

  it.each([
    ['-1', 'negative'],
    ['0', 'zero'],
    ['abc', 'not a number'],
    ['', 'empty'],
    ['1.5', 'fractional'],
    ['1e9', 'exponent notation'],
    ['0x10', 'hex'],
    [' 4 ', 'padded — accepted, trimmed'],
  ])('handles %s (%s) without producing a bad page', (raw) => {
    const { page } = parsePageParams({ page: raw });
    expect(Number.isSafeInteger(page)).toBe(true);
    expect(page).toBeGreaterThanOrEqual(1);
  });

  it('accepts a padded number rather than silently defaulting', () => {
    expect(parsePageParams({ page: ' 4 ' }).page).toBe(4);
  });

  it('rejects a non-string page — arrays arrive from repeated params', () => {
    expect(parsePageParams({ page: ['3'] }).page).toBe(1);
    expect(parsePageParams({ page: 3 }).page).toBe(1);
  });

  it('caps pageSize so ?pageSize=100000 cannot undo pagination', () => {
    const max = PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1];
    expect(parsePageParams({ pageSize: '100000' }).pageSize).toBe(max);
  });
});

describe('pageCount', () => {
  it('never returns 0, so "Page 1 of 0" cannot render', () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(-5, 25)).toBe(1);
  });

  it('rounds up a partial last page', () => {
    expect(pageCount(207, 25)).toBe(9);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
  });

  it('survives a nonsense page size', () => {
    expect(pageCount(100, 0)).toBe(1);
    expect(pageCount(100, Number.NaN)).toBe(1);
  });
});

describe('rangeFor', () => {
  it('is 0-indexed and inclusive, matching Supabase .range()', () => {
    expect(rangeFor(1, 25)).toEqual({ from: 0, to: 24 });
    expect(rangeFor(2, 25)).toEqual({ from: 25, to: 49 });
  });

  it('has no gap or overlap between consecutive pages', () => {
    const a = rangeFor(3, 10);
    const b = rangeFor(4, 10);
    expect(b.from).toBe(a.to + 1);
  });
});

describe('clampPage', () => {
  it('pulls a page past the end back to the last real one', () => {
    // The exact bug: an admin on page 7 searches, three rows match.
    expect(clampPage(7, 3, 25)).toBe(1);
    expect(clampPage(9, 207, 25)).toBe(9);
    expect(clampPage(20, 207, 25)).toBe(9);
  });

  it('never returns below 1, even for an empty result', () => {
    expect(clampPage(1, 0, 25)).toBe(1);
    expect(clampPage(-3, 0, 25)).toBe(1);
  });
});

describe('pageHref', () => {
  it('keeps every existing filter when changing page', () => {
    const href = pageHref('/admin/survey-data', { q: 'law', sort: 'field' }, { page: 3 });
    expect(href).toContain('q=law');
    expect(href).toContain('sort=field');
    expect(href).toContain('page=3');
  });

  it('omits page=1, since it is the default', () => {
    expect(pageHref('/admin/survey-data', {}, { page: 1 })).toBe('/admin/survey-data');
  });

  it('drops empty values rather than leaving q= in the URL', () => {
    expect(pageHref('/admin/survey-data', { q: 'x' }, { q: '' })).toBe('/admin/survey-data');
  });

  it('encodes a value that would otherwise break the query string', () => {
    const href = pageHref('/admin/survey-data', {}, { q: 'a&b=c d' });
    expect(href).not.toMatch(/q=a&b=c d/);
    expect(href).toContain('q=a%26b%3Dc+d');
  });

  it('returns the bare path when nothing is left to encode', () => {
    expect(pageHref('/admin/responses', {}, {})).toBe('/admin/responses');
  });
});

describe('paginationWindow', () => {
  it('lists every page when there are few', () => {
    expect(paginationWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('always includes the first and last page', () => {
    const w = paginationWindow(10, 20);
    expect(w[0]).toBe(1);
    expect(w[w.length - 1]).toBe(20);
  });

  it('marks elided runs with null rather than dropping them silently', () => {
    const w = paginationWindow(10, 20);
    expect(w).toContain(null);
    expect(w).toContain(10);
  });

  it('does not elide a single missing page — a "…" hiding one number is noise', () => {
    // With 8 pages and the cursor at 1, the gap logic must not produce
    // adjacent numbers separated by an ellipsis standing for nothing.
    const w = paginationWindow(1, 8);
    for (let i = 1; i < w.length - 1; i += 1) {
      if (w[i] === null) {
        expect(w[i + 1] - w[i - 1]).toBeGreaterThan(2);
      }
    }
  });

  it('never repeats a page number', () => {
    const w = paginationWindow(2, 30).filter((p) => p !== null);
    expect(new Set(w).size).toBe(w.length);
  });

  it('stays in ascending order', () => {
    const w = paginationWindow(15, 30).filter((p) => p !== null);
    expect([...w].sort((a, b) => a - b)).toEqual(w);
  });
});
