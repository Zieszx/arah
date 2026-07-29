// Unit tests for lib/admin/disagreements.js — the fingerprint-matching
// heuristic behind /admin/responses' "disagreements" filter. See that
// module's header comment for why this is a fingerprint match rather than
// a foreign-key join: alumni_profiles has no column linking a
// contribution back to the student account or submission that produced
// it.
import { describe, it, expect } from 'vitest';
import {
  fingerprintFromQuizAnswers,
  fingerprintFromAlumniRow,
  findDisagreement,
} from '@/lib/admin/disagreements';

const QUIZ_ANSWERS = {
  school: 'Public School (SMK / SMJKC)',
  results: '6 - 8 As (A-, A, A+)',
  stream: ['Science (Biology, Chemistry etc)'],
  enjoyed: ['Science Subjects (Science, Biology, Physics)'],
  difficult: ['Language Subjects (B. Melayu, B. Inggeris, B. Arab)'],
  tasks: ['Analysing and interpreting data'],
  traits: ['Analytical', 'Observant'],
  personality: 'Introvert',
  speaking: 3,
  preu: 'A-Levels',
};

// Same ten answers, mapped onto alumni_profiles' column names
// (lib/contribute/submission.js#mapContributionToRow's mapping), field
// order in the arrays deliberately scrambled to prove order-independence.
function contributionRow(overrides = {}) {
  return {
    field_of_study: 'Computer Science, Software & Data (Cybersecurity, Data Analytics etc)',
    school_type: 'Public School (SMK / SMJKC)',
    spm_results: '6 - 8 As (A-, A, A+)',
    streams: ['Science (Biology, Chemistry etc)'],
    subjects_enjoyed: ['Science Subjects (Science, Biology, Physics)'],
    subjects_difficult: ['Language Subjects (B. Melayu, B. Inggeris, B. Arab)'],
    tasks_enjoyed: ['Analysing and interpreting data'],
    characteristics: ['Observant', 'Analytical'], // scrambled order
    personality: 'Introvert',
    public_speaking: 3,
    preu_program: 'A-Levels',
    ...overrides,
  };
}

describe('fingerprintFromQuizAnswers / fingerprintFromAlumniRow', () => {
  it('the same person\'s answers fingerprint identically regardless of array order', () => {
    const quizFp = fingerprintFromQuizAnswers(QUIZ_ANSWERS);
    const rowFp = fingerprintFromAlumniRow(contributionRow());
    expect(quizFp).not.toBeNull();
    expect(quizFp).toBe(rowFp);
  });

  it('a missing quiz answer (marginalised: no preu) refuses to fingerprint at all', () => {
    const { preu, ...withoutPreu } = QUIZ_ANSWERS;
    expect(fingerprintFromQuizAnswers(withoutPreu)).toBeNull();
  });

  it('a different answer produces a different fingerprint', () => {
    const quizFp = fingerprintFromQuizAnswers(QUIZ_ANSWERS);
    const differentRowFp = fingerprintFromAlumniRow(contributionRow({ personality: 'Extrovert' }));
    expect(differentRowFp).not.toBe(quizFp);
  });

  it('null/garbage input never throws', () => {
    expect(fingerprintFromQuizAnswers(null)).toBeNull();
    expect(fingerprintFromQuizAnswers(undefined)).toBeNull();
    expect(fingerprintFromAlumniRow(null)).toBeNull();
  });
});

describe('findDisagreement', () => {
  it('matches a fingerprint and returns the contributed field when it differs from the model\'s top pick', () => {
    const contributed = [contributionRow()];
    const result = findDisagreement(QUIZ_ANSWERS, 'Engineering (Mechanical, Civil, Electrical etc)', contributed);
    expect(result).toBe('Computer Science, Software & Data (Cybersecurity, Data Analytics etc)');
  });

  it('returns null when the contributed field AGREES with the top pick (not a disagreement)', () => {
    const contributed = [contributionRow()];
    const topField = 'Computer Science, Software & Data (Cybersecurity, Data Analytics etc)';
    expect(findDisagreement(QUIZ_ANSWERS, topField, contributed)).toBeNull();
  });

  it('returns null when no contributed row fingerprint-matches this submission', () => {
    const strangersRow = contributionRow({ personality: 'Extrovert' });
    expect(findDisagreement(QUIZ_ANSWERS, 'Engineering', [strangersRow])).toBeNull();
  });

  it('returns null for an empty/missing contributed-rows list — the "no contributions yet" case', () => {
    expect(findDisagreement(QUIZ_ANSWERS, 'Engineering', [])).toBeNull();
    expect(findDisagreement(QUIZ_ANSWERS, 'Engineering', null)).toBeNull();
  });

  it('never falsely attributes a stranger\'s contribution — a coincidental partial overlap is not enough', () => {
    // Same field_of_study but every predictive answer differs — must not match.
    const stranger = contributionRow({
      school_type: 'Private School',
      spm_results: '1 - 2 As (A-, A, A+)',
      streams: ['Arts'],
      subjects_enjoyed: ['Art, Humanities & Social Science Subjects (Art, History, P.Islam/Moral)'],
      subjects_difficult: ['Mathematical Subjects'],
      tasks_enjoyed: ['Creating or designing things'],
      characteristics: ['Creative'],
      personality: 'Extrovert',
      public_speaking: 5,
      preu_program: 'Diploma',
    });
    expect(findDisagreement(QUIZ_ANSWERS, 'Engineering', [stranger])).toBeNull();
  });
});
