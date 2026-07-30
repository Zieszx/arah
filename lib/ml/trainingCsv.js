/**
 * Pure helpers for turning an alumni_profiles row into a training-CSV line.
 *
 * Split out of scripts/export-training-csv.mjs so the two rules that actually
 * carry risk — column order and row identity — can be tested without a
 * database. The script keeps the I/O; this file keeps the decisions.
 */

/** Multi-select columns are stored as arrays and were split on ';' on the way in. */
function join(v) {
  return Array.isArray(v) ? v.join(';') : (v ?? '');
}

function yesNo(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '';
}

export function text(v) {
  return v === null || v === undefined ? '' : String(v);
}

/**
 * Column order is ml/train.py's contract, not a preference. The index
 * comments map to EXPECTED_HEADER_SUBSTRINGS in that file, which asserts a
 * substring per index so a reordered export fails loudly instead of training
 * on misaligned data.
 */
export const COLUMNS = [
  (r) => r.created_at ?? '', //          0 Timestamp (unread by the model)
  (r) => r.gender, //                    1
  (r) => r.spm_year, //                  2
  (r) => r.state, //                     3
  (r) => r.school_type, //               4 "type of secondary school"
  (r) => join(r.streams), //             5 "which stream"
  (r) => r.spm_results, //               6 "spm results"
  (r) => join(r.subjects_enjoyed), //    7 "enjoy most"
  (r) => join(r.subjects_difficult), //  8 "most difficult"
  (r) => r.personality, //               9 "your personality"
  (r) => join(r.tasks_enjoyed), //      10 "type of tasks"
  (r) => join(r.characteristics), //    11 "your characteristics"
  (r) => r.public_speaking, //          12 "public speaking"
  (r) => r.preu_program, //             13 "pre-university"
  (r) => r.field_of_study, //           14 "major"
  (r) => join(r.reasons), //            15
  (r) => yesNo(r.stream_related), //    16
  (r) => r.satisfaction, //             17
  (r) => r.advice, //                   18
];

export function toCells(row) {
  return COLUMNS.map((get) => get(row));
}

/**
 * Identity of a response, ignoring column 0 — the timestamp is the one field
 * that cannot round-trip (the CSV holds a Google Forms submission time, the
 * database only has created_at).
 *
 * Both sides are normalised the way scripts/seed-alumni.mjs normalised on the
 * way in: `txt()` trims, `multi()` splits on ';' then trims and drops empty
 * parts. Comparing raw text instead fails on 52 of the 207 seed rows, because
 * cells like "Maths " lost their trailing space when stored — and those rows
 * would then be appended as duplicates of themselves on every run.
 */
export function contentKey(cells) {
  return JSON.stringify(
    cells
      .slice(1)
      .map((c) =>
        text(c)
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(';')
      )
  );
}

/** Every field quoted, embedded quotes doubled — matches the Forms export. */
export function csvLine(cells) {
  return cells.map((c) => `"${text(c).replace(/"/g, '""')}"`).join(',');
}
