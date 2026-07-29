// Guard: the Supabase service-role key must NEVER appear in a client
// bundle. That key bypasses RLS and every column grant — leaking it turns
// every policy in supabase/migrations/ into decoration. lib/supabase/admin.js
// already fails the build on an accidental client import (via the
// `server-only` package); this test is the second line of defence, scanning
// the actual built browser assets in .next/static for the key's value.
//
// The key is read from .env.development.local and compared in memory only —
// it is never printed, not even on failure (offending file paths are
// reported, not contents).
//
// Skips (rather than fails) when there is no build output or no env file,
// so `npm test` stays runnable on a fresh clone; CI and the pre-commit
// verification flow both run `npm run build` first, which arms it.
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATIC_DIR = path.join(ROOT, '.next', 'static');
const ENV_FILE = path.join(ROOT, '.env.development.local');

function readServiceRoleKey() {
  if (!existsSync(ENV_FILE)) return null;
  const line = readFileSync(ENV_FILE, 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
  if (!line) return null;
  const value = line
    .slice('SUPABASE_SERVICE_ROLE_KEY='.length)
    .trim()
    .replace(/^["']|["']$/g, '');
  return value.length > 0 ? value : null;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const key = readServiceRoleKey();
const haveBuild = existsSync(STATIC_DIR);

describe('service-role key never ships to the browser', () => {
  it.skipIf(!key || !haveBuild)(
    'no file under .next/static contains SUPABASE_SERVICE_ROLE_KEY',
    () => {
      const offenders = [];
      let scanned = 0;
      for (const file of walk(STATIC_DIR)) {
        scanned += 1;
        const content = readFileSync(file, 'utf8');
        if (content.includes(key)) {
          offenders.push(path.relative(ROOT, file));
        }
      }
      // The scan must have actually looked at something — an empty static
      // dir passing silently would defang the guard.
      expect(scanned).toBeGreaterThan(0);
      expect(offenders).toEqual([]);
    }
  );

  it.skipIf(!haveBuild)(
    'sanity: the scanner can see real bundle content (negative control)',
    () => {
      // Prove the same walk/read machinery detects strings that ARE in the
      // bundle: every Next.js client build contains at least one chunk with
      // a "use strict" or export marker. If this ever fails, the main
      // assertion above is scanning nothing and cannot be trusted.
      let found = false;
      for (const file of walk(STATIC_DIR)) {
        if (!file.endsWith('.js')) continue;
        const content = readFileSync(file, 'utf8');
        if (content.includes('function')) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    }
  );
});
