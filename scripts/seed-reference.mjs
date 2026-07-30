/**
 * Load ml/data/reference/*.csv into public.reference_statistics.
 *
 * Context figures only — see the migration's header and docs/DATA-SOURCES.md
 * for why these can never be training data. Idempotent: rows are upserted on
 * (segment, level, as_of), so re-running corrects a figure rather than
 * duplicating it.
 *
 * Env vars come from Node's native --env-file (see the npm script) — do not
 * re-add dotenv.
 *
 * Run: npm run seed:reference
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = 'ml/data/reference/mohe-enrolment-2025.csv';
const SOURCE_URL = 'https://www.mohe.gov.my/en/download/statistics';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const db = createClient(url, key, { auth: { persistSession: false } });

const rows = parse(readFileSync(CSV_PATH, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  bom: true,
});

/** Empty stays null — Number('') is 0, which would publish a false figure. */
function int(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}

function num(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const records = rows.map((r) => ({
  segment: r.segment.trim(),
  level: r.level.trim(),
  total_students: int(r.total_students),
  malaysian_students: int(r.malaysian_students),
  international_students: int(r.international_students),
  international_pct: num(r.international_pct),
  as_of: r.as_of.trim(),
  source: r.source.trim(),
  source_url: SOURCE_URL,
}));

// Refuse to publish a figure that does not add up. These are cited numbers
// attributed to a ministry; a transcription slip would be us putting a wrong
// statistic in their name.
for (const rec of records) {
  const { malaysian_students: my, international_students: intl, total_students: total } = rec;
  if (my !== null && intl !== null && my + intl !== total) {
    throw new Error(
      `${rec.segment} / ${rec.level}: ${my} + ${intl} = ${my + intl}, not ${total}`
    );
  }
  if (rec.total_students === null) {
    throw new Error(`${rec.segment} / ${rec.level}: missing total_students`);
  }
}

const { error } = await db
  .from('reference_statistics')
  .upsert(records, { onConflict: 'segment,level,as_of' });
if (error) throw error;

const { count } = await db
  .from('reference_statistics')
  .select('id', { count: 'exact', head: true });

console.log(`seeded ${records.length} reference rows from ${CSV_PATH}`);
console.log(`reference_statistics now holds ${count} rows`);
console.log('Context only — never training data. See docs/DATA-SOURCES.md.');
