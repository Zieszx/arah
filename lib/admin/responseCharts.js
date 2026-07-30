// Data for /admin/response-charts — a Google-Forms-style summary of every
// question, one distribution per question.
//
// Two sources, because "the responses" means two different things depending
// on who is asking:
//
//   alumni  — the 207 verified survey rows the model is trained on. This is
//             the form that was actually filled in.
//   students — what people have answered on /questions since launch. Same
//             ten questions, but these are current students describing
//             themselves, not alumni reporting an outcome.
//
// Keeping them separate matters: averaging them would produce a chart that
// describes neither group.
//
// Exact counts, deliberately. The k-anonymity suppression, count banding and
// refresh gating in supabase/migrations/0009_* and 0010_* exist to protect
// the PUBLIC /explore pages, where an outsider could subtract one view from
// another to isolate an individual. This module is service-role, imported
// only by a page behind requireAdmin(), and is the same call
// lib/admin/overview.js already makes for the field-distribution bar: an
// admin doing support needs the real number, and banding it here would only
// make the console useless without protecting anybody. It must never be
// imported by anything under app/api or a public page.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getGroups } from '@/lib/features';
import { displayLabel } from '@/lib/i18n/labels';

export const CHART_SOURCES = ['alumni', 'students'];

// Group key -> the alumni_profiles column holding the same answer. The quiz
// stores its answers keyed by group key already, so only this direction
// needs a map.
const ALUMNI_COLUMNS = {
  stream: 'streams',
  enjoyed: 'subjects_enjoyed',
  difficult: 'subjects_difficult',
  tasks: 'tasks_enjoyed',
  traits: 'characteristics',
  personality: 'personality',
  results: 'spm_results',
  preu: 'preu_program',
  school: 'school_type',
  speaking: 'public_speaking',
};

// Questions the survey asked that the model does not use as a feature, but
// which an admin still wants to see summarised — this is a form summary, not
// a feature report. `field` is the outcome, and the rest are context.
const EXTRA_ALUMNI_QUESTIONS = [
  { key: 'field', column: 'field_of_study', type: 'single', label: 'What field of study did they pursue?' },
  { key: 'satisfaction', column: 'satisfaction', type: 'num', min: 1, max: 5, label: 'How satisfied are they with it?' },
  { key: 'reasons', column: 'reasons', type: 'multi', label: 'Why did they choose that field?' },
  { key: 'stream_related', column: 'stream_related', type: 'bool', label: 'Is the field related to their SPM stream?' },
  { key: 'spm_year', column: 'spm_year', type: 'single', label: 'Which year did they sit SPM?' },
  { key: 'state', column: 'state', type: 'single', label: 'Which state did they sit SPM in?' },
  { key: 'gender', column: 'gender', type: 'single', label: 'Gender' },
];

/** Every value that should appear on a chart for this question, flattened. */
function valuesFor(row, question) {
  const raw = row[question.column ?? question.key];
  if (question.type === 'multi') {
    return Array.isArray(raw) ? raw.filter((v) => typeof v === 'string' && v.trim()) : [];
  }
  if (question.type === 'bool') {
    if (raw === true) return ['Yes'];
    if (raw === false) return ['No'];
    return [];
  }
  if (question.type === 'num') {
    // Bucketed by its integer value so a 1-5 scale reads as five bars, the
    // way a Forms linear-scale question does.
    return Number.isFinite(raw) ? [String(raw)] : [];
  }
  return typeof raw === 'string' && raw.trim() ? [raw] : [];
}

/**
 * Count answers into { label, value } buckets, ordered largest first —
 * except numeric scales, which stay in scale order because 1,2,3,4,5 sorted
 * by popularity is unreadable as a distribution.
 */
function tally(rows, question) {
  const counts = new Map();
  let answered = 0;

  // Seeding from the known options means an option nobody picked still shows
  // as a zero bar. That absence is information — "no one chose Sports
  // Science" is a finding, and a chart that silently omits it looks like the
  // option does not exist.
  if (question.type === 'num') {
    for (let n = question.min ?? 1; n <= (question.max ?? 5); n += 1) {
      counts.set(String(n), 0);
    }
  } else if (Array.isArray(question.options)) {
    for (const option of question.options) counts.set(option, 0);
  } else if (question.type === 'bool') {
    counts.set('Yes', 0);
    counts.set('No', 0);
  }

  for (const row of rows) {
    const values = valuesFor(row, question);
    if (values.length > 0) answered += 1;
    for (const value of values) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  let entries = [...counts.entries()].map(([label, value]) => ({
    // Raw values are stored; labels.js fixes the two survey typos at the
    // last moment, exactly as everywhere else that renders them.
    label: displayLabel(label),
    value,
  }));

  if (question.type === 'num') {
    entries.sort((a, b) => Number(a.label) - Number(b.label));
  } else if (question.type === 'bool') {
    // Leave Yes before No.
  } else {
    entries.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }

  return {
    key: question.key,
    label: question.label,
    type: question.type,
    entries,
    answered,
    // Multi-select questions let one person tick three boxes, so the bars
    // sum past the respondent count. Stating both stops a reader dividing by
    // the wrong denominator.
    multi: question.type === 'multi',
  };
}

/** Questions to chart, in the order the form asked them. */
function questionsFor(source) {
  const groups = getGroups().map((g) => ({
    key: g.key,
    column: source === 'alumni' ? ALUMNI_COLUMNS[g.key] : g.key,
    type: g.type,
    label: g.label,
    options: g.options,
    min: g.min,
    max: g.max,
  }));
  if (source !== 'alumni') return groups;
  return [...groups, ...EXTRA_ALUMNI_QUESTIONS];
}

async function fetchAlumniRows(supabase) {
  const columns = [
    ...new Set([
      ...Object.values(ALUMNI_COLUMNS),
      ...EXTRA_ALUMNI_QUESTIONS.map((q) => q.column),
    ]),
  ].join(', ');
  const { data, error } = await supabase
    .from('alumni_profiles')
    .select(columns)
    .eq('verified', true);
  if (error) throw error;
  return data ?? [];
}

async function fetchStudentRows(supabase) {
  const { data, error } = await supabase.from('quiz_responses').select('answers');
  if (error) throw error;
  // Every submission stores one `answers` object keyed by group key, so the
  // rows are already in the shape valuesFor() reads.
  return (data ?? [])
    .map((row) => row.answers)
    .filter((a) => a && typeof a === 'object');
}

/**
 * All question distributions for one source.
 *
 * Returns { source, respondents, questions } or null on failure — the page
 * renders a designed error state, same convention as the other admin data
 * modules.
 */
export async function getResponseCharts(source = 'alumni') {
  const which = CHART_SOURCES.includes(source) ? source : 'alumni';
  const supabase = createAdminClient();
  try {
    const rows =
      which === 'alumni'
        ? await fetchAlumniRows(supabase)
        : await fetchStudentRows(supabase);
    return {
      source: which,
      respondents: rows.length,
      questions: questionsFor(which).map((q) => tally(rows, q)),
    };
  } catch (error) {
    console.error(
      'admin response-charts: aggregation failed:',
      error?.code ?? error?.message
    );
    return null;
  }
}
