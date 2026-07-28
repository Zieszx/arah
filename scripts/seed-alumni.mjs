/**
 * Load the 207 survey rows into alumni_profiles.
 * Idempotent: clears source='survey_2025' first, so re-running is safe.
 *
 * Env vars come from Node's native --env-file (see the npm script) — do not
 * re-add dotenv.
 *
 * Run: npm run seed:alumni
 */
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const db = createClient(url, key, { auth: { persistSession: false } });

const rows = parse(readFileSync('ml/data/survey.csv', 'utf8'), {
  columns: false, skip_empty_lines: true, bom: true,
});
const [header, ...body] = rows;
if (!/gender/i.test(header[1])) throw new Error(`unexpected header: ${header[1]}`);

const multi = (v) => (v ?? '').split(';').map((s) => s.trim()).filter(Boolean);
const num = (v) => {
  const s = (v ?? '').trim();
  if (!s) return null; // Number('') === 0, which would fail the 1-5 check constraint
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const txt = (v) => (v ?? '').trim() || null;

const records = body
  .filter((r) => txt(r[14]))
  .map((r) => ({
    gender: txt(r[1]), spm_year: txt(r[2]), state: txt(r[3]), school_type: txt(r[4]),
    streams: multi(r[5]), spm_results: txt(r[6]),
    subjects_enjoyed: multi(r[7]), subjects_difficult: multi(r[8]),
    personality: txt(r[9]), tasks_enjoyed: multi(r[10]), characteristics: multi(r[11]),
    public_speaking: num(r[12]), preu_program: txt(r[13]), field_of_study: txt(r[14]),
    reasons: multi(r[15]),
    stream_related: txt(r[16]) === null ? null : /^yes$/i.test(txt(r[16])),
    satisfaction: num(r[17]), advice: txt(r[18]),
    source: 'survey_2025', verified: true,
  }));

await db.from('alumni_profiles').delete().eq('source', 'survey_2025');

for (let i = 0; i < records.length; i += 100) {
  const chunk = records.slice(i, i + 100);
  const { error } = await db.from('alumni_profiles').insert(chunk);
  if (error) throw error;
  console.log(`inserted ${Math.min(i + 100, records.length)}/${records.length}`);
}

const { count } = await db
  .from('alumni_profiles')
  .select('*', { count: 'exact', head: true });
console.log(`done — alumni_profiles now holds ${count} rows`);
if (count !== 207) throw new Error(`expected 207 rows, found ${count}`);
