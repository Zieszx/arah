// Unit tests for lib/admin/overview.js — the admin overview's data layer.
//
//  - shortFieldLabel(): the parenthetical-stripping used for chart labels,
//    including the one genuine survey typo case (labels.js's header
//    explains why "Dentristry" lives entirely inside the parenthetical
//    this strips, so no displayLabel() correction is ever needed here).
//  - getOverviewStats(): every count resolves independently and fails
//    soft — one table erroring must not take the whole page down, and a
//    failed count must come back as `null` (unavailable), never coerced
//    to `0` (a real, legitimate count) or thrown.
//
// The Supabase query builder is faked rather than imported: real
// supabase-js chains (`.select().eq()...`) are themselves thenable, so
// the fake below mimics exactly that shape, keyed by table name, with
// each test configuring what each table "returns" for this run.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// lib/admin/overview.js itself starts with `import 'server-only'` — same
// fix, same reason as tests/js/require-admin.test.js's identical stub.
vi.mock('server-only', () => ({}));

let responses = {};

function makeQuery(table) {
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    then(resolve, reject) {
      const result = responses[table];
      if (!result) {
        reject(new Error(`no fake response configured for table "${table}"`));
        return;
      }
      resolve(result);
    },
  };
  return query;
}

const createAdminClientMock = vi.fn(() => ({
  from: (table) => makeQuery(table),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }));

const { getOverviewStats, shortFieldLabel } = await import('@/lib/admin/overview.js');

describe('shortFieldLabel', () => {
  it('strips a trailing parenthetical', () => {
    expect(shortFieldLabel('Business & Management (Accounting, Finance etc)')).toBe(
      'Business & Management'
    );
  });

  it('strips the parenthetical containing the survey typo, with no correction needed', () => {
    expect(
      shortFieldLabel('Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)')
    ).toBe('Health & Medical Sciences');
  });

  it('leaves a string with no parenthetical unchanged', () => {
    expect(shortFieldLabel('Engineering')).toBe('Engineering');
  });

  it('passes non-strings through unchanged', () => {
    expect(shortFieldLabel(null)).toBeNull();
    expect(shortFieldLabel(undefined)).toBeUndefined();
  });
});

describe('getOverviewStats', () => {
  beforeEach(() => {
    responses = {};
  });

  it('returns every count and a sorted, deduped field distribution on success', async () => {
    responses = {
      alumni_profiles: { count: 207, error: null, data: [] },
      profiles: { count: 40, error: null },
      quiz_responses: { count: 12, error: null },
      predictions: { count: 12, error: null },
    };
    // alumni_profiles is queried twice (verified=true count, verified=false
    // count, and the field_of_study select) — the fake keys purely by
    // table name, so this test focuses on the shape rather than telling
    // the three calls apart; a second, targeted test below exercises the
    // field distribution grouping on its own.
    const stats = await getOverviewStats();
    expect(stats.totalAlumni).toBe(207);
    expect(stats.studentsRegistered).toBe(40);
    expect(stats.questionsCompleted).toBe(12);
    expect(stats.predictionsIssued).toBe(12);
  });

  it('a failing count comes back as null, never 0, and does not throw', async () => {
    responses = {
      alumni_profiles: { count: null, error: { code: 'PGRST000', message: 'boom' }, data: null },
      profiles: { count: 5, error: null },
      quiz_responses: { count: 0, error: null },
      predictions: { count: 0, error: null },
    };
    const stats = await getOverviewStats();
    expect(stats.totalAlumni).toBeNull();
    expect(stats.pendingContributions).toBeNull();
    // A table that genuinely has zero rows still reports 0, distinct from
    // the null above — the whole point of the null/0 distinction.
    expect(stats.questionsCompleted).toBe(0);
    expect(stats.predictionsIssued).toBe(0);
  });

  it('groups and sorts the field distribution by count, descending', async () => {
    responses = {
      alumni_profiles: {
        count: 5,
        error: null,
        data: [
          { field_of_study: 'Engineering' },
          { field_of_study: 'Business & Management (Accounting etc)' },
          { field_of_study: 'Business & Management (Accounting etc)' },
          { field_of_study: 'Engineering' },
          { field_of_study: 'Engineering' },
        ],
      },
      profiles: { count: 1, error: null },
      quiz_responses: { count: 1, error: null },
      predictions: { count: 1, error: null },
    };
    const stats = await getOverviewStats();
    expect(stats.fieldDistribution).toEqual([
      { field: 'Engineering', count: 3 },
      { field: 'Business & Management', count: 2 },
    ]);
  });

  it('field distribution failure comes back as null, not an empty array (distinct empty states)', async () => {
    responses = {
      alumni_profiles: { count: null, error: { code: 'x' }, data: null },
      profiles: { count: 0, error: null },
      quiz_responses: { count: 0, error: null },
      predictions: { count: 0, error: null },
    };
    const stats = await getOverviewStats();
    expect(stats.fieldDistribution).toBeNull();
  });
});
