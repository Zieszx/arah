/**
 * Export the database to supabase/dump/ so the system can be restored from
 * this repository alone.
 *
 * The migrations in supabase/migrations/ already define the SCHEMA, and they
 * remain the source of truth for it — this is not a replacement for them.
 * What they do not carry is the DATA: the 207 alumni rows the model is
 * trained and matched against. Handing over a schema with no rows means
 * whoever receives it gets an empty product.
 *
 * Two files, deliberately separate:
 *
 *   schema.sql  structure only, for reading and for diffing against the
 *               migrations if they are ever suspected of having drifted
 *   data.sql    the alumni_profiles rows, as COPY statements
 *
 * WHAT IS DELIBERATELY NOT EXPORTED
 *
 * auth.users, profiles, quiz_responses and predictions are excluded. Those are
 * real people's accounts, their answers and their results. A database dump
 * gets copied into shared drives, attached to emails and committed by mistake;
 * personal data must not be the thing that travels that easily. alumni_profiles
 * is different in kind — it is the consented survey, carries no names, no
 * contact details and no identifiers, and is already the published dataset.
 *
 * Run: npm run export:db
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'supabase/dump';

// Non-pooling: pg_dump holds a session and issues statements a transaction
// pooler will refuse.
const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
if (!url) {
  throw new Error(
    'POSTGRES_URL_NON_POOLING is required — run with --env-file=.env.development.local'
  );
}

// Only these tables' contents leave the database. Everything else is either
// personal data or is rebuilt by the migrations.
const DATA_TABLES = ['public.alumni_profiles'];

fs.mkdirSync(OUT_DIR, { recursive: true });

function pgDump(args, outFile) {
  const out = execFileSync('pg_dump', [url, ...args], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  fs.writeFileSync(path.join(OUT_DIR, outFile), out, 'utf8');
  return out.split('\n').length;
}

console.log('exporting schema…');
const schemaLines = pgDump(
  ['--schema-only', '--schema=public', '--no-owner', '--no-privileges'],
  'schema.sql'
);
console.log(`  supabase/dump/schema.sql (${schemaLines} lines)`);

console.log('exporting data…');
const dataLines = pgDump(
  [
    '--data-only',
    '--no-owner',
    '--no-privileges',
    ...DATA_TABLES.flatMap((t) => ['--table', t]),
  ],
  'data.sql'
);
console.log(`  supabase/dump/data.sql (${dataLines} lines)`);

// A dump nobody can verify is a dump nobody will trust. State the row count
// and fail loudly if the export came back empty.
const data = fs.readFileSync(path.join(OUT_DIR, 'data.sql'), 'utf8');
const copyRows = (data.match(/^[^\\-].*\t/gm) ?? []).length;
if (copyRows === 0) {
  throw new Error('data.sql contains no rows — refusing to claim a successful export');
}
console.log(`  ${copyRows} alumni rows exported`);
console.log('\nExcluded, deliberately: auth.users, profiles, quiz_responses,');
console.log('predictions — personal data does not belong in a portable dump.');
