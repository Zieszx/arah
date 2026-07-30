// Guards the two rules in the contribution -> training-set export that can
// fail silently and expensively: the column order ml/train.py asserts on, and
// the row identity that decides whether a row is "already in the corpus".
//
// The identity rule is the one with teeth. It was wrong on the first pass:
// comparing raw text re-appended 52 of the 207 seed rows as duplicates of
// themselves on every run, because the Google Forms export contains cells
// like "Maths " whose stored form lost the trailing space. Nothing crashed —
// the corpus just silently grew garbage.
import { describe, it, expect } from 'vitest';
import {
  COLUMNS,
  toCells,
  contentKey,
  csvLine,
} from '@/lib/ml/trainingCsv.js';

// Mirrors ml/train.py's EXPECTED_HEADER_SUBSTRINGS. If someone reorders
// COLUMNS, train.py's own assertion fires at training time — this fires here,
// which is very much cheaper.
const EXPECTED_AT_INDEX = {
  1: 'gender',
  4: 'school_type',
  5: 'streams',
  6: 'spm_results',
  7: 'subjects_enjoyed',
  8: 'subjects_difficult',
  9: 'personality',
  10: 'tasks_enjoyed',
  11: 'characteristics',
  12: 'public_speaking',
  13: 'preu_program',
  14: 'field_of_study',
};

function row(overrides = {}) {
  return {
    created_at: '2026-01-01T00:00:00Z',
    gender: 'Female',
    spm_year: 'SPM 2023',
    state: 'Johor',
    school_type: 'Private School',
    streams: ['Science (Biology, Chemistry etc)'],
    spm_results: '6 - 8 As (A-, A, A+)',
    subjects_enjoyed: ['Mathematical Subjects'],
    subjects_difficult: ['Language Subjects'],
    personality: 'Introvert',
    tasks_enjoyed: ['Solving logical or mathematical problems'],
    characteristics: ['Analytical'],
    public_speaking: 2,
    preu_program: 'Foundation',
    field_of_study: 'Computer Science, Software & Data',
    reasons: ['Personal interest & Passion'],
    stream_related: true,
    satisfaction: 5,
    advice: 'Choose what you enjoy.',
    ...overrides,
  };
}

describe('training CSV column contract', () => {
  it('emits exactly the 19 columns train.py expects', () => {
    expect(COLUMNS).toHaveLength(19);
    expect(toCells(row())).toHaveLength(19);
  });

  it('puts every model-read field at the index train.py asserts on', () => {
    // A probe value per field, so a swapped pair cannot pass by coincidence.
    for (const [index, field] of Object.entries(EXPECTED_AT_INDEX)) {
      const probe = `PROBE_${field}`;
      const source = row();
      source[field] = Array.isArray(source[field]) ? [probe] : probe;
      expect(toCells(source)[Number(index)]).toBe(probe);
    }
  });

  it('joins multi-select columns on ";", the separator seed-alumni split on', () => {
    const cells = toCells(row({ streams: ['Science', 'Arts'] }));
    expect(cells[5]).toBe('Science;Arts');
  });

  it('writes stream_related as Yes/No, and empty when unknown', () => {
    expect(toCells(row({ stream_related: true }))[16]).toBe('Yes');
    expect(toCells(row({ stream_related: false }))[16]).toBe('No');
    expect(toCells(row({ stream_related: null }))[16]).toBe('');
  });

  it('writes an absent numeric as an empty cell, never 0', () => {
    // Asserted on the emitted line, not on toCells: the accessors pass the
    // stored value straight through and csvLine is what renders absence. 0
    // would sit inside the 1-5 scale and read as an answer rather than a gap.
    // Rendered one cell at a time — splitting a whole line on ',' would
    // misalign, since real answers like "6 - 8 As (A-, A, A+)" contain commas.
    const cellAt = (r, i) => csvLine([toCells(r)[i]]);
    expect(cellAt(row({ public_speaking: null }), 12)).toBe('""');
    expect(cellAt(row({ satisfaction: null }), 17)).toBe('""');
    // And a real 0-adjacent value still comes through as itself.
    expect(cellAt(row({ public_speaking: 1 }), 12)).toBe('"1"');
  });
});

describe('row identity (the duplicate guard)', () => {
  it('ignores the timestamp, which cannot round-trip', () => {
    const a = toCells(row({ created_at: '2026-01-01T00:00:00Z' }));
    const b = toCells(row({ created_at: 'totally different' }));
    expect(contentKey(a)).toBe(contentKey(b));
  });

  it('treats a stored value as equal to its untrimmed CSV original', () => {
    // The exact shape of the bug: CSV holds "Maths ", the database holds
    // "Maths". These are the same answer and must not re-append.
    const csvCells = toCells(row({ subjects_enjoyed: ['Maths '] }));
    const dbCells = toCells(row({ subjects_enjoyed: ['Maths'] }));
    expect(contentKey(csvCells)).toBe(contentKey(dbCells));
  });

  it('ignores empty parts left by a trailing separator', () => {
    const withTrailer = toCells(row({ characteristics: ['Analytical', '', ' '] }));
    const clean = toCells(row({ characteristics: ['Analytical'] }));
    expect(contentKey(withTrailer)).toBe(contentKey(clean));
  });

  it('still separates two genuinely different responses', () => {
    // The negative control: normalisation must not be so aggressive that
    // distinct alumni collapse into one and get dropped from training.
    const a = toCells(row({ field_of_study: 'Engineering' }));
    const b = toCells(row({ field_of_study: 'Law & Legal Studies' }));
    expect(contentKey(a)).not.toBe(contentKey(b));
  });

  it('does not confuse order within a multi-select', () => {
    const a = toCells(row({ streams: ['Science', 'Arts'] }));
    const b = toCells(row({ streams: ['Arts', 'Science'] }));
    expect(contentKey(a)).not.toBe(contentKey(b));
  });
});

describe('csvLine quoting', () => {
  it('quotes every field, as the Google Forms export did', () => {
    expect(csvLine(['a', 'b'])).toBe('"a","b"');
  });

  it('doubles embedded quotes rather than escaping them', () => {
    expect(csvLine(['she said "hi"'])).toBe('"she said ""hi"""');
  });

  it('leaves a comma inside a field alone — the quotes carry it', () => {
    expect(csvLine(['Computer Science, Software & Data'])).toBe(
      '"Computer Science, Software & Data"'
    );
  });

  it('renders null and undefined as empty, not as the words', () => {
    expect(csvLine([null, undefined])).toBe('"",""');
  });
});
