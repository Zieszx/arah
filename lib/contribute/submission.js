// Pure logic behind POST /api/contribute — payload shaping, validation and
// the alumni_profiles row mapping. Framework-free (no Next.js imports), so
// tests/js/contribute-submission.test.js can exercise it directly, exactly
// like lib/quiz/submission.js does for the quiz route. The route handler
// (app/api/contribute/route.js) is thin glue over these.
//
// Contribute asks a real alumnus to re-answer the same ten predictive
// questions the original survey asked (rendered from feature_spec.json —
// see outcomeGroups()/PREDICTIVE_ORDER below and components/contribute/
// ContributeForm.jsx, which renders both through the same OptionGrid the
// quiz itself uses), plus four outcome fields the model doesn't consume:
// which field they actually studied, why, how satisfied they ended up,
// and free-text advice. Those four map onto columns feature_spec.json has
// no opinion about at all — supabase/migrations/0001_init.sql is the
// source of truth for their shape.
import { getGroups, getSpec, validateAnswers } from '@/lib/features';
import en from '@/lib/i18n/en';

// "What were the main reasons for choosing that major? (Select up to 3)"
// — verbatim from ml/data/survey.csv's own header and option text. Not a
// feature_spec.json value: reasons was never a predictive input (it is an
// OUTCOME the student already knows, not a signal available before they
// chose), so there is no parity fixture tying these strings to the model
// and no risk in this list ever drifting from feature_spec.json, because
// it was never derived from it.
export const REASONS_OPTIONS = [
  'Personal interest & Passion',
  'Academic strength in SPM subjects',
  'Job opportunities',
  'Salary potential',
  'Family expectation',
  'Peers / Friends influence',
  'University / Scolarship offer',
];
export const REASONS_MAX_SELECT = 3;

export const SATISFACTION_MIN = 1;
export const SATISFACTION_MAX = 5;

export const ADVICE_MIN_LENGTH = 15;
export const ADVICE_MAX_LENGTH = 1000;

/**
 * The three outcome questions, shaped exactly like a feature_spec.json
 * group so components/contribute/ContributeForm.jsx can render them
 * through the same OptionGrid the quiz uses (lib/features.js's `single` /
 * `multi` / `num` group types) — never a bespoke, undertested control for
 * "just these three".
 */
export function outcomeGroups() {
  return [
    {
      key: 'field_of_study',
      type: 'single',
      label: en.contribute.fieldOfStudyLabel,
      options: getSpec().classes,
    },
    {
      key: 'reasons',
      type: 'multi',
      label: en.contribute.reasonsLabel,
      max_select: REASONS_MAX_SELECT,
      options: REASONS_OPTIONS,
    },
    {
      key: 'satisfaction',
      type: 'num',
      label: en.contribute.satisfactionLabel,
      min: SATISFACTION_MIN,
      max: SATISFACTION_MAX,
      // components/quiz/OptionGrid.jsx#NumberScale: overrides the
      // public-speaking-specific endpoint copy that scale would otherwise
      // fall back to.
      scaleLowLabel: en.contribute.satisfactionLow,
      scaleHighLabel: en.contribute.satisfactionHigh,
    },
  ];
}

/**
 * Reduce a client payload to answers this module actually recognises,
 * mirroring lib/quiz/useQuizState.js#buildPayload's contract (unknown
 * keys never reach the database; empty values are omitted, never sent as
 * ''). `advice` is trimmed here so a client that pads with whitespace
 * can't dodge the length check either side of the wire.
 */
export function cleanContribution(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

  for (const g of getGroups()) {
    const v = raw[g.key];
    if (v == null) continue;
    if (typeof v === 'string' && v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[g.key] = v;
  }
  for (const g of outcomeGroups()) {
    const v = raw[g.key];
    if (v == null) continue;
    if (typeof v === 'string' && v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[g.key] = v;
  }
  if (typeof raw.advice === 'string') {
    const trimmed = raw.advice.trim();
    if (trimmed) out.advice = trimmed;
  }
  return out;
}

/**
 * Validate a cleaned contribution payload. Returns the same `{ ok, errors }`
 * shape as lib/features.js#validateAnswers, with outcome-field keys added
 * alongside the ten predictive ones so a single 422 response can list
 * every offending field by name (never by index, never by a raw Postgres
 * message — see app/api/contribute/route.js).
 *
 * `preu` is REQUIRED here even though feature_spec.json marks it optional.
 * That optionality exists for the live quiz's marginalisation feature (a
 * student who hasn't decided their pre-U route yet) — it does not apply
 * to someone donating their own already-completed history, who by
 * definition knows which route they took. Skipping it here would insert
 * a false "not sure yet" into a real alumnus's row.
 */
export function validateContribution(answers) {
  const { errors: predictiveErrors } = validateAnswers(answers);
  const errors = { ...predictiveErrors };

  // validateAnswers() never flags a missing preu (the spec marks it
  // optional, for the quiz's marginalisation feature — see the doc
  // comment above). If it IS present but not a real option, validateAnswers
  // has already set errors.preu correctly; only "absent entirely" needs
  // adding here.
  if (!('preu' in errors) && (!answers.preu || typeof answers.preu !== 'string')) {
    errors.preu = 'Tell us which pre-U route you actually took.';
  }

  const classes = getSpec().classes;
  if (typeof answers.field_of_study !== 'string' || !classes.includes(answers.field_of_study)) {
    errors.field_of_study = 'Choose the field you actually studied.';
  }

  const reasons = Array.isArray(answers.reasons) ? answers.reasons.filter(Boolean) : [];
  if (reasons.length === 0) {
    errors.reasons = 'Pick at least one reason.';
  } else if (reasons.length > REASONS_MAX_SELECT) {
    errors.reasons = `Choose at most ${REASONS_MAX_SELECT}.`;
  } else if (reasons.some((r) => !REASONS_OPTIONS.includes(r))) {
    errors.reasons = 'Unrecognised reason.';
  }

  const satisfaction = answers.satisfaction;
  if (
    typeof satisfaction !== 'number' ||
    !Number.isFinite(satisfaction) ||
    !Number.isInteger(satisfaction) ||
    satisfaction < SATISFACTION_MIN ||
    satisfaction > SATISFACTION_MAX
  ) {
    errors.satisfaction = `Choose a whole number between ${SATISFACTION_MIN} and ${SATISFACTION_MAX}.`;
  }

  const advice = typeof answers.advice === 'string' ? answers.advice.trim() : '';
  if (advice.length < ADVICE_MIN_LENGTH) {
    errors.advice = `A little more detail helps — at least ${ADVICE_MIN_LENGTH} characters.`;
  } else if (advice.length > ADVICE_MAX_LENGTH) {
    errors.advice = `Keep it under ${ADVICE_MAX_LENGTH} characters.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Map a validated contribution to an alumni_profiles insert row
 * (0001_init.sql's column names). `verified` and `source` are NOT
 * parameters — they are fixed constants here so there is no code path,
 * however contrived the caller, that can make this function return
 * verified: true. A crafted request body setting "verified": true is
 * simply never read; nothing here ever inspects that key.
 */
export function mapContributionToRow(answers) {
  return {
    school_type: answers.school,
    spm_results: answers.results,
    streams: Array.isArray(answers.stream) ? answers.stream : [],
    subjects_enjoyed: Array.isArray(answers.enjoyed) ? answers.enjoyed : [],
    subjects_difficult: Array.isArray(answers.difficult) ? answers.difficult : [],
    tasks_enjoyed: Array.isArray(answers.tasks) ? answers.tasks : [],
    characteristics: Array.isArray(answers.traits) ? answers.traits : [],
    personality: answers.personality,
    public_speaking: answers.speaking,
    preu_program: answers.preu,
    field_of_study: answers.field_of_study,
    reasons: Array.isArray(answers.reasons) ? answers.reasons : [],
    satisfaction: answers.satisfaction,
    advice: typeof answers.advice === 'string' ? answers.advice.trim() : answers.advice,
    source: 'user_contributed',
    verified: false,
  };
}
