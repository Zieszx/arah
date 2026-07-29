// Unit tests for lib/admin/surveyTable.js — the search/sort logic behind
// SurveyTable.jsx, exercised directly (no React, no PrimeReact) per that
// module's own header comment.
import { describe, it, expect } from 'vitest';
import { filterRows, sortRows, SORTABLE_FIELDS } from '@/lib/admin/surveyTable';

const ROWS = [
  {
    id: '1',
    field_of_study: 'Engineering',
    streams: ['Science (Biology, Chemistry etc)'],
    spm_results: '6 - 8 As (A-, A, A+)',
    preu_program: 'A-Levels',
    satisfaction: 4,
    advice: 'Work hard and choose what you love',
  },
  {
    id: '2',
    field_of_study: 'Creative Art (Fashion Design, Interior Design etc)',
    streams: ['Arts'],
    spm_results: '3 - 5 As (A-, A, A+)',
    preu_program: null,
    satisfaction: 5,
    advice: 'Follow your passion',
  },
  {
    id: '3',
    field_of_study: 'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)',
    streams: ['Science (Biology, Chemistry etc)', 'Islamic Studies'],
    spm_results: '9+ As (A-, A, A+)',
    preu_program: 'Foundation',
    satisfaction: 2,
    advice: null,
  },
];

describe('filterRows', () => {
  it('returns every row for an empty/whitespace query', () => {
    expect(filterRows(ROWS, '')).toHaveLength(3);
    expect(filterRows(ROWS, '   ')).toHaveLength(3);
  });

  it('matches case-insensitively against the field name', () => {
    expect(filterRows(ROWS, 'engineering')).toEqual([ROWS[0]]);
  });

  it('matches through displayLabel — the corrected spelling finds the raw typo\'d row', () => {
    // labels.js#CORRECTIONS fixes "Dentristry" -> "Dentistry" at display
    // time; searching the corrected spelling must still find the row.
    expect(filterRows(ROWS, 'dentistry')).toEqual([ROWS[2]]);
  });

  it('matches against stream, pre-U route and advice', () => {
    expect(filterRows(ROWS, 'islamic studies')).toEqual([ROWS[2]]);
    expect(filterRows(ROWS, 'foundation')).toEqual([ROWS[2]]);
    expect(filterRows(ROWS, 'follow your passion')).toEqual([ROWS[1]]);
  });

  it('a null advice or preu never crashes the search', () => {
    expect(() => filterRows(ROWS, 'anything')).not.toThrow();
    expect(filterRows(ROWS, 'zzz-no-match')).toEqual([]);
  });
});

describe('sortRows', () => {
  it('sorts ascending by field of study (display label order)', () => {
    const sorted = sortRows(ROWS, 'field', 1);
    expect(sorted.map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('sorts descending', () => {
    const sorted = sortRows(ROWS, 'field', -1);
    expect(sorted.map((r) => r.id)).toEqual(['3', '1', '2']);
  });

  it('sorts numerically by satisfaction, not lexicographically', () => {
    const sorted = sortRows(ROWS, 'satisfaction', 1);
    expect(sorted.map((r) => r.satisfaction)).toEqual([2, 4, 5]);
  });

  it('an unknown sort field is a no-op (returns rows unchanged)', () => {
    expect(sortRows(ROWS, 'not_a_field', 1)).toEqual(ROWS);
  });

  it('every SORTABLE_FIELDS entry actually sorts without throwing', () => {
    for (const field of SORTABLE_FIELDS) {
      expect(() => sortRows(ROWS, field, 1)).not.toThrow();
    }
  });
});
