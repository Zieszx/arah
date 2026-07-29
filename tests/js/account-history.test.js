// Pure logic behind /account's quiz history list (lib/account/history.js).
// The orphan case — a quiz_responses row with no completed prediction — is
// the one this module exists to get right: it was proven live during Task
// 4 testing (ML service down mid-submission) and must never render as a
// broken or silently dropped row.
import { describe, it, expect } from 'vitest';
import { buildQuizHistory } from '@/lib/account/history.js';

const GOOD_RESULTS = {
  ranked: [
    { field: 'Media & Communication', probability: 0.6 },
    { field: 'Engineering', probability: 0.4 },
  ],
};

describe('buildQuizHistory', () => {
  it('pairs a quiz_responses row with its matching prediction', () => {
    const responses = [
      { id: 'r1', answers: { school: 'Private School' }, created_at: '2026-07-20T10:00:00Z' },
    ];
    const predictions = [
      {
        id: 'p1',
        quiz_response_id: 'r1',
        results: GOOD_RESULTS,
        model_version: '2026-07-28',
        marginalised: false,
        created_at: '2026-07-20T10:00:05Z',
      },
    ];
    const [item] = buildQuizHistory(responses, predictions);
    expect(item).toMatchObject({
      quizResponseId: 'r1',
      prediction: { id: 'p1', topField: 'Media & Communication', marginalised: false },
    });
  });

  it('a response with no matching prediction row is an orphan (prediction: null)', () => {
    const responses = [
      { id: 'r1', answers: { school: 'Private School' }, created_at: '2026-07-20T10:00:00Z' },
    ];
    const [item] = buildQuizHistory(responses, []);
    expect(item.prediction).toBeNull();
    expect(item.answers).toEqual({ school: 'Private School' });
  });

  it('a prediction row with no renderable ranked entries collapses to orphan too', () => {
    const responses = [
      { id: 'r1', answers: {}, created_at: '2026-07-20T10:00:00Z' },
    ];
    for (const badResults of [
      { ranked: [] },
      { ranked: [{ field: '', probability: 0.5 }] },
      { ranked: [{ field: 'X', probability: 'high' }] },
      { ranked: null },
      {},
      null,
    ]) {
      const predictions = [
        {
          id: 'p1',
          quiz_response_id: 'r1',
          results: badResults,
          model_version: '2026-07-28',
          marginalised: false,
          created_at: '2026-07-20T10:00:05Z',
        },
      ];
      const [item] = buildQuizHistory(responses, predictions);
      expect(item.prediction).toBeNull();
    }
  });

  it('sorts newest first regardless of input order', () => {
    const responses = [
      { id: 'old', answers: {}, created_at: '2026-01-01T00:00:00Z' },
      { id: 'new', answers: {}, created_at: '2026-07-28T00:00:00Z' },
      { id: 'mid', answers: {}, created_at: '2026-04-01T00:00:00Z' },
    ];
    const items = buildQuizHistory(responses, []);
    expect(items.map((i) => i.quizResponseId)).toEqual(['new', 'mid', 'old']);
  });

  it('keeps predictions and responses matched by id, not by array position', () => {
    const responses = [
      { id: 'r1', answers: {}, created_at: '2026-07-01T00:00:00Z' },
      { id: 'r2', answers: {}, created_at: '2026-07-02T00:00:00Z' },
    ];
    const predictions = [
      {
        id: 'p2',
        quiz_response_id: 'r2',
        results: GOOD_RESULTS,
        marginalised: true,
        created_at: '2026-07-02T00:00:05Z',
      },
    ];
    const items = buildQuizHistory(responses, predictions);
    const r1 = items.find((i) => i.quizResponseId === 'r1');
    const r2 = items.find((i) => i.quizResponseId === 'r2');
    expect(r1.prediction).toBeNull();
    expect(r2.prediction).toMatchObject({ id: 'p2', marginalised: true });
  });

  it('marginalised is coerced to a strict boolean', () => {
    const responses = [{ id: 'r1', answers: {}, created_at: '2026-07-01T00:00:00Z' }];
    const predictions = [
      {
        id: 'p1',
        quiz_response_id: 'r1',
        results: GOOD_RESULTS,
        marginalised: undefined,
        created_at: '2026-07-01T00:00:05Z',
      },
    ];
    const [item] = buildQuizHistory(responses, predictions);
    expect(item.prediction.marginalised).toBe(false);
  });

  it('never throws on garbage input, and returns an empty list', () => {
    for (const junk of [null, undefined, 'x', 42, {}]) {
      expect(buildQuizHistory(junk, junk)).toEqual([]);
    }
  });

  it('an empty responses array is the empty-state case: no items at all', () => {
    expect(buildQuizHistory([], [])).toEqual([]);
  });
});
