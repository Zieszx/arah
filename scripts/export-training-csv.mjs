/**
 * Append approved contributions to ml/data/survey.csv — the missing half of
 * the give-back loop.
 *
 * seed-alumni.mjs pushes the frozen 2025 survey INTO the database; nothing
 * brought approved contributions back OUT, so `python ml/train.py` could only
 * ever see the original 207 rows no matter how many an admin approved.
 *
 * APPEND, not regenerate. A full regenerate was the obvious first design and
 * it is wrong: all 207 seed rows were bulk-inserted within the same instant,
 * so `order by created_at` cannot reproduce the file's original row order and
 * every export rewrote all 207 lines as a permutation of themselves. That
 * buries the one thing a reviewer needs to see — which rows are new — under a
 * 414-line diff, and it perturbs the CV fold assignment for no reason.
 * Existing rows are therefore left byte-identical and new rows are appended.
 *
 * Matching is on content, not on id: the CSV has no id column, and the
 * timestamp is the one field the round-trip cannot reproduce (the original is
 * a Google Forms submission time, the database only has created_at). So a row
 * is "already present" when columns 1..18 match an existing line exactly.
 *
 * Deliberately NOT automatic. Retraining rewrites services/ml/model.joblib, a
 * committed artefact baked into the deployed Python service, and train.py
 * aborts below a 66.0% top-3 CV floor. A model change must be a reviewed
 * commit, not a silent background job — so this writes the CSV and stops.
 *
 * Env vars come from Node's native --env-file (see the npm script) — do not
 * re-add dotenv.
 *
 * Run: npm run export:training
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import {
  toCells,
  contentKey,
  csvLine,
} from '../lib/ml/trainingCsv.js';

const CSV_PATH = 'ml/data/survey.csv';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const db = createClient(url, key, { auth: { persistSession: false } });

const existingRaw = readFileSync(CSV_PATH, 'utf8');
const existingRows = parse(existingRaw, {
  columns: false,
  skip_empty_lines: true,
  bom: true,
}).filter((r) => r.some((c) => c.trim()));

const [header] = existingRows;
if (!/gender/i.test(header[1] ?? '')) {
  throw new Error(`${CSV_PATH} header looks wrong; refusing to touch it`);
}

const seen = new Set(existingRows.slice(1).map(contentKey));

// Supabase caps a select at 1000 rows by default; page explicitly so this
// keeps working as the corpus grows past that.
async function fetchAll() {
  const all = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await db
      .from('alumni_profiles')
      .select('*')
      // Only verified rows train the model: user_contributed rows land with
      // verified=false and stay out until an admin approves them.
      .eq('verified', true)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + size - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < size) return all;
  }
}

const verified = (await fetchAll()).filter((r) =>
  (r.field_of_study ?? '').trim()
);

if (verified.length === 0) {
  throw new Error('no verified rows returned; check SUPABASE_URL');
}

const appended = [];
for (const row of verified) {
  const cells = toCells(row);
  const key = contentKey(cells);
  // Guards both against re-appending the seed corpus and against appending
  // the same contribution twice across successive runs.
  if (seen.has(key)) continue;
  seen.add(key);
  appended.push(csvLine(cells));
}

const existingCount = existingRows.length - 1;

if (appended.length === 0) {
  // Not process.exit(0): tearing the process down while the Supabase client
  // still holds an open handle trips a libuv assertion on Windows, which
  // prints a crash trace after a run that actually succeeded. Falling off the
  // end of the module instead lets Node close things in order.
  console.log(`${CSV_PATH} is already up to date — ${existingCount} rows.`);
  console.log('No approved contribution is missing from the training set.');
} else {
  // Match the file's existing line ending. It is CRLF on this checkout, and
  // some advice cells contain real newlines inside their quotes, so appending
  // with a bare '\n' would leave the file mixed — parseable, but it makes
  // every later diff look like it touched lines it did not.
  const eol = existingRaw.includes('\r\n') ? '\r\n' : '\n';
  const body = appended.map((line) => line.replace(/\r?\n/g, eol));
  writeFileSync(
    CSV_PATH,
    existingRaw.replace(/(\r?\n)*$/, eol) + body.join(eol) + eol,
    'utf8'
  );

  console.log(`appended ${appended.length} approved contribution(s) to ${CSV_PATH}`);
  console.log(`  ${existingCount} -> ${existingCount + appended.length} rows`);
  console.log('');
  console.log('Next, by hand — this does not happen on its own:');
  console.log('  1. python ml/train.py      (aborts below the 66.0% top-3 CV floor)');
  console.log('  2. read the printed accuracy; if it dropped, do not ship it');
  console.log('  3. commit ml/data/survey.csv, services/ml/model.joblib,');
  console.log('     services/ml/feature_spec.json, ml/parity_fixtures.json');
  console.log('  4. redeploy — the model is bundled into the Python service');
}
