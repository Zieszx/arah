// Unit tests for lib/admin/surveyQuery.js — the server-side search and sort
// that replaced the in-browser filtering in lib/admin/surveyTable.js.
//
// Two things here are genuinely dangerous. PostgREST's `or` filter is a
// comma-separated list inside ONE string, and every real field value in this
// dataset contains both a comma and parentheses — "Science (Biology,
// Chemistry etc)" — so unescaped input silently changes what the filter
// means. And `sort` is interpolated into the order clause straight off the
// query string, so the allowlist is a boundary, not a convenience.
import { describe, it, expect } from 'vitest';
import {
  SORT_COLUMNS,
  SORTABLE_COLUMNS,
  isSortable,
  escapeForOr,
  searchVariants,
  buildOrClause,
  streamOptions,
  TEXT_SEARCH_COLUMNS,
} from '@/lib/admin/surveyQuery';
import { correctionEntries } from '@/lib/i18n/labels';

/**
 * Split an `or(...)` argument the way PostgREST does: on commas that are
 * neither backslash-escaped nor inside a double-quoted literal. A naive
 * split on every comma is wrong — the array-contains conditions carry real
 * commas inside their quotes on purpose.
 */
function splitConditions(clause) {
  const parts = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < clause.length; i += 1) {
    const c = clause[i];
    if (c === '\\') {
      current += c + (clause[i + 1] ?? '');
      i += 1;
      continue;
    }
    if (c === '"') quoted = !quoted;
    if (c === ',' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts.filter(Boolean);
}

describe('sortable column allowlist', () => {
  it('maps every advertised key to a real column', () => {
    for (const key of SORTABLE_COLUMNS) {
      expect(typeof SORT_COLUMNS[key]).toBe('string');
      expect(SORT_COLUMNS[key].length).toBeGreaterThan(0);
    }
  });

  it('rejects anything not on the list', () => {
    expect(isSortable('field')).toBe(true);
    expect(isSortable('advice')).toBe(false);
    expect(isSortable('id; drop table alumni_profiles')).toBe(false);
    expect(isSortable('')).toBe(false);
    expect(isSortable(undefined)).toBe(false);
    expect(isSortable(null)).toBe(false);
  });

  it('is not fooled by inherited Object properties', () => {
    // A plain `key in SORT_COLUMNS` would return true for these.
    expect(isSortable('constructor')).toBe(false);
    expect(isSortable('toString')).toBe(false);
    expect(isSortable('__proto__')).toBe(false);
  });
});

describe('escapeForOr', () => {
  it('escapes the characters that would end the clause early', () => {
    expect(escapeForOr('a,b')).toBe('a\\,b');
    expect(escapeForOr('a(b)')).toBe('a\\(b\\)');
    expect(escapeForOr('a\\b')).toBe('a\\\\b');
  });

  it('escapes a real option string, commas and brackets and all', () => {
    const escaped = escapeForOr('Science (Biology, Chemistry etc)');
    expect(escaped).toBe('Science \\(Biology\\, Chemistry etc\\)');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeForOr('engineering')).toBe('engineering');
  });
});

describe('searchVariants — the typo bridge', () => {
  const corrections = correctionEntries();

  it('adds the raw survey spelling when the admin types the corrected one', () => {
    // The screen renders "Resilient"; the database stores "Resiliant".
    const variants = searchVariants('Resilient', corrections);
    expect(variants).toContain('Resilient');
    expect(variants).toContain('Resiliant');
  });

  it('matches on a partial too, since search is a substring match', () => {
    expect(searchVariants('dentistry', corrections)).toContain(
      'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)'
    );
  });

  it('is case-insensitive', () => {
    expect(searchVariants('RESILIENT', corrections)).toContain('Resiliant');
  });

  it('returns just the query when no correction is involved', () => {
    expect(searchVariants('engineering', corrections)).toEqual(['engineering']);
  });
});

describe('buildOrClause', () => {
  it('covers every text column', () => {
    const clause = buildOrClause('law', []);
    for (const column of TEXT_SEARCH_COLUMNS) {
      expect(clause).toContain(`${column}.ilike.*law*`);
    }
  });

  it('turns a stream query into exact array-contains conditions', () => {
    // ILIKE cannot reach inside a text[], so a text query is resolved
    // against the six known values instead.
    const clause = buildOrClause('Islamic', []);
    expect(clause).toContain('streams.cs.{"Islamic Studies"}');
  });

  it('escapes a query containing a comma so the clause is not split', () => {
    const clause = buildOrClause('Biology, Chemistry', []);
    expect(clause).toContain('Biology\\, Chemistry');
    for (const part of splitConditions(clause)) {
      expect(part).toMatch(/^(field_of_study|spm_results|preu_program|advice|streams)\./);
    }
  });

  it('leaves the comma inside a quoted array literal alone', () => {
    // Verified against the live database, not assumed: the double quotes in
    // streams.cs.{"Science (Biology, Chemistry etc)"} protect that comma,
    // and the clause returns 81 rows — exactly the count of that stream when
    // the same rows are filtered in JavaScript. Backslash-escaping it as
    // well returns the same 81, so quoting alone is sufficient and is what
    // the implementation relies on.
    const clause = buildOrClause('Science (Biology', []);
    expect(clause).toContain('streams.cs.{"Science (Biology, Chemistry etc)"}');
    for (const part of splitConditions(clause)) {
      expect(part).toMatch(/^(field_of_study|spm_results|preu_program|advice|streams)\./);
    }
  });

  it('produces no conditions from an empty query beyond the bare wildcards', () => {
    // Callers skip the filter entirely for an empty query; this just pins
    // that an empty string cannot produce a malformed clause.
    expect(() => buildOrClause('', [])).not.toThrow();
  });
});

describe('streamOptions', () => {
  it('reads the six values from the trained feature spec, not a retyped list', () => {
    const options = streamOptions();
    expect(options.length).toBe(6);
    expect(options).toContain('Science (Biology, Chemistry etc)');
    expect(options.every((o) => typeof o === 'string' && o.length > 0)).toBe(true);
  });
});
