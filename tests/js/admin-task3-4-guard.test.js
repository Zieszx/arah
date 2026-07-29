// End-to-end proof of requireAdmin() on the two Task 3/4 routes
// (/admin/survey-data, /admin/responses), against a REAL running server —
// same technique as tests/js/admin-page-guard.test.js (which proves this
// for /admin itself): a unit test of the redirect logic cannot prove what
// actually reaches the network, so this signs in for real, fetches each
// route over HTTP, and inspects the served bytes.
//
// Task 3/4 raise the stakes over the base /admin case: survey-data renders
// real students' free-text advice, and responses renders another
// student's personal quiz answers. If requireAdmin() ever regressed on
// just these two routes (e.g. a future edit that trims the "call it again
// in page.jsx" pattern down to "the layout already did it"), a non-admin
// could read that data — so each route gets its own fingerprint check
// here rather than relying solely on the shared /admin coverage.
//
// Three cases per route, plus the negative control that proves the scan
// can actually detect the fingerprint when it's supposed to be there:
//   1. signed in, NON-ADMIN -> redirected away, and the landing page body
//      contains NONE of that route's markup.
//   2. signed in, ADMIN (negative control) -> 200, and the body DOES
//      contain the route's markup.
//
// Needs a running app (next dev or next start) plus the local env files;
// skips, like its sibling, when either is missing.
import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE_URL = process.env.ARAH_BASE_URL ?? 'http://localhost:3000';

function readEnvFile(name) {
  const file = path.join(ROOT, name);
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = {
  ...readEnvFile('.env.development.local'),
  ...readEnvFile('.env.seed.local'),
};

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = env.SEED_USER_EMAIL;
const ADMIN_PASSWORD = env.SEED_USER_PASSWORD;

const haveEnv = Boolean(
  SUPABASE_URL && ANON_KEY && SERVICE_KEY && ADMIN_EMAIL && ADMIN_PASSWORD
);

async function serverIsUp() {
  try {
    const res = await fetch(BASE_URL, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    return res.status > 0;
  } catch {
    return false;
  }
}

const up = haveEnv ? await serverIsUp() : false;
const run = haveEnv && up;

async function signInCookieHeader(email, password) {
  const jar = new Map();
  const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.code}`);
  const header = Array.from(jar, ([name, value]) => `${name}=${value}`).join('; ');
  if (!header) throw new Error('sign-in produced no cookies');
  return header;
}

async function fetchRoute(path, cookieHeader) {
  return fetch(BASE_URL + path, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
}

// Markup fingerprints that only ever appear once that specific route's
// content has actually rendered — never present on the public site, and
// distinct per route so a false pass (e.g. always finding /admin's own
// sidebar label) can't slip through unnoticed.
const ROUTES = [
  {
    path: '/admin/survey-data',
    fingerprints: [
      'All 207 verified alumni rows',
      'Do not republish them attributed',
    ],
  },
  {
    path: '/admin/responses',
    fingerprints: [
      'Every questions submission',
      'Disagreements',
    ],
  },
];

const studentEmail = `admin-t34-guard-${randomUUID().slice(0, 8)}@arah.test`;
const studentPassword = `Guard-${randomUUID()}`;
let studentId = null;
const admin = run
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

async function createStudent() {
  const { data, error } = await admin.auth.admin.createUser({
    email: studentEmail,
    password: studentPassword,
    email_confirm: true,
  });
  if (error) throw error;
  studentId = data.user.id;
  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id: studentId }, { onConflict: 'id' });
  if (pErr) throw pErr;
}

afterAll(async () => {
  if (admin && studentId) {
    await admin.auth.admin.deleteUser(studentId);
  }
});

describe.skipIf(!run)('Task 3/4 routes are gated by requireAdmin()', () => {
  for (const { path: routePath, fingerprints } of ROUTES) {
    it(
      `${routePath} — signed in NON-ADMIN: redirected, landing page has NONE of this route's markup`,
      { timeout: 90000 },
      async () => {
        if (!studentId) await createStudent();
        const cookie = await signInCookieHeader(studentEmail, studentPassword);
        const res = await fetchRoute(routePath, cookie);
        expect([301, 302, 307, 308]).toContain(res.status);
        const location = res.headers.get('location') ?? '';
        // requireAdmin() sends a signed-in non-admin to '/', never /login.
        expect(location).not.toContain('/login');

        const landed = await fetch(new URL(location, BASE_URL), {
          headers: { cookie },
          redirect: 'manual',
          signal: AbortSignal.timeout(30000),
        });
        const html = await landed.text();
        expect(html).toContain('Log out'); // sanity: really signed in
        for (const fingerprint of fingerprints) {
          expect(html).not.toContain(fingerprint);
        }
      }
    );

    it(
      `${routePath} — signed in ADMIN (negative control): 200, and the body DOES contain this route's markup`,
      { timeout: 90000 },
      async () => {
        const cookie = await signInCookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD);
        const res = await fetchRoute(routePath, cookie);
        expect(res.status).toBe(200);
        const html = await res.text();
        for (const fingerprint of fingerprints) {
          expect(html).toContain(fingerprint);
        }
      }
    );
  }
});

describe('admin-task3-4-guard preconditions', () => {
  it('reports why the suite ran or skipped', () => {
    console.log(
      `admin-task3-4-guard: env=${haveEnv ? 'present' : 'missing'} server=${up ? 'up' : 'down'} base=${BASE_URL}`
    );
    expect(true).toBe(true);
  });
});
