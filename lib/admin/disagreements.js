// The "disagreements" signal behind /admin/responses (Task 4) — pure logic,
// framework-free, so tests/js/admin-disagreements.test.js can exercise it
// without Supabase or React.
//
// The honest limitation this file works around: alumni_profiles (where a
// contribution lands, app/api/contribute/route.js) has NO user_id,
// quiz_response_id or any other column linking a contribution back to the
// student account or submission that produced it — see that route's
// header comment and supabase/migrations/0001_init.sql. There is
// therefore no foreign key this module could join on. What it does
// instead: a contributor re-answers the exact same ten predictive
// questions the quiz asks (lib/contribute/submission.js#outcomeGroups /
// mapContributionToRow uses the identical feature_spec.json groups), so a
// contributed row whose ten predictive answers EXACTLY match a stored
// quiz_responses.answers is treated as "very likely the same person,
// afterward". This is a fingerprint match, not a verified identity link —
// the ten answers together (several multi-select groups) have enough
// combinatorial entropy that a coincidental match is unlikely.
//
// Deliberately conservative: a quiz answer missing a value (e.g.
// marginalised, so `preu` is absent) can never fingerprint-match a
// contribution, which always has every field (validateContribution
// requires it) — see normalize() below. Under-matching (missing a real
// disagreement) is the safe failure direction; over-matching (attributing
// a stranger's contribution to this student) is not, so ties are broken
// toward "no match" throughout.
// WHY THIS IS A FINGERPRINT AND NOT A FOREIGN KEY.
//
// Contributions are anonymous by design, and /privacy tells students so:
// "that submission is anonymous and unlinked, so it stays in the dataset".
// A quiz_response_id column here would make every contribution traceable to
// an account and make that sentence false. It would also force a choice with
// no good answer on account deletion: delete the contribution and lose real
// consented training data, or keep it and make "delete everything" untrue.
//
// The imprecision is the cheaper cost. Reviewed and accepted 2026-07-30 —
// see docs/KNOWN-ISSUES.md #3 before changing this.

const ARRAY_KEYS = ['stream', 'enjoyed', 'difficult', 'tasks', 'traits'];
const SCALAR_KEYS = ['school', 'results', 'personality', 'preu'];

function normalizeArrayValue(v) {
  if (!Array.isArray(v) || v.length === 0) return null;
  return [...v].filter((x) => typeof x === 'string' && x).sort().join('|');
}

function normalizeScalar(v) {
  return typeof v === 'string' && v ? v : null;
}

function normalizeSpeaking(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * A single canonical string fingerprint of the ten predictive answers, or
 * null if any one of them is missing (see the header comment on why an
 * incomplete answer set is refused rather than partially matched).
 */
function fingerprint({ school, results, stream, enjoyed, difficult, tasks, traits, personality, speaking, preu }) {
  const parts = [
    normalizeScalar(school),
    normalizeScalar(results),
    normalizeArrayValue(stream),
    normalizeArrayValue(enjoyed),
    normalizeArrayValue(difficult),
    normalizeArrayValue(tasks),
    normalizeArrayValue(traits),
    normalizeScalar(personality),
    normalizeSpeaking(speaking),
    normalizeScalar(preu),
  ];
  if (parts.some((p) => p === null)) return null;
  return JSON.stringify(parts);
}

/** Fingerprint from a stored quiz_responses.answers object. */
export function fingerprintFromQuizAnswers(answers) {
  if (!answers || typeof answers !== 'object') return null;
  return fingerprint(answers);
}

/**
 * Fingerprint from an alumni_profiles row (contribution) — same shape,
 * different column names (0001_init.sql), mirroring the mapping
 * lib/contribute/submission.js#mapContributionToRow uses in the other
 * direction.
 */
export function fingerprintFromAlumniRow(row) {
  if (!row) return null;
  return fingerprint({
    school: row.school_type,
    results: row.spm_results,
    stream: row.streams,
    enjoyed: row.subjects_enjoyed,
    difficult: row.subjects_difficult,
    tasks: row.tasks_enjoyed,
    traits: row.characteristics,
    personality: row.personality,
    speaking: row.public_speaking,
    preu: row.preu_program,
  });
}

/**
 * Does `answers` (this submission's original quiz answers) fingerprint-
 * match a contributed alumni row whose field_of_study differs from
 * `topField` (the model's top-ranked field for this submission)? Returns
 * the matching row's field_of_study (raw, un-displayLabel'd) if so, else
 * null. `contributedRows` should already be filtered to
 * source = 'user_contributed' by the caller (lib/admin/responses.js).
 */
export function findDisagreement(answers, topField, contributedRows) {
  const fp = fingerprintFromQuizAnswers(answers);
  if (!fp || !topField || !Array.isArray(contributedRows)) return null;
  const match = contributedRows.find((row) => fingerprintFromAlumniRow(row) === fp);
  if (!match || match.field_of_study === topField) return null;
  return match.field_of_study;
}
