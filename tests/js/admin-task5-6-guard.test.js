// End-to-end proof of requireAdmin() on /admin/algorithm-tester — same
// technique as tests/js/admin-task3-4-guard.test.js: a unit test of the
// redirect logic cannot prove what actually reaches the network, so this
// signs in for real, fetches the route over HTTP, and inspects the served
// bytes/status.
//
// Two things, the second being the negative control that proves the scan can
// actually detect what it's looking for:
//   1. Signed in NON-ADMIN -> redirected away, and the landing page body
//      contains NONE of that route's markup.
//   2. Signed in ADMIN -> 200, and the body DOES contain it.
//
// This file also covered /admin/contributions and POST
// /api/admin/contributions until the contribute feature was removed at the
// client's request; both were deleted with it.
//
// Needs a running app (next dev or next start) plus the local env files;
// skips, like its siblings, when either is missing.
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
    const res = await fetch(BASE_URL, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
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

async function fetchRoute(routePath, cookieHeader) {
  return fetch(BASE_URL + routePath, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
}

const ROUTES = [
  {
    path: '/admin/algorithm-tester',
    fingerprints: ['Run the model directly', 'admin · algorithm tester'],
  },
];

const studentEmail = `admin-t56-guard-${randomUUID().slice(0, 8)}@arah.test`;
const studentPassword = `Guard-${randomUUID()}`;
let studentId = null;
const admin = run
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

async function createStudent() {
  if (studentId) return;
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

describe.skipIf(!run)('Task 5/6 pages are gated by requireAdmin()', () => {
  for (const { path: routePath, fingerprints } of ROUTES) {
    it(
      `${routePath} — signed in NON-ADMIN: redirected, landing page has NONE of this route's markup`,
      { timeout: 90000 },
      async () => {
        await createStudent();
        const cookie = await signInCookieHeader(studentEmail, studentPassword);
        const res = await fetchRoute(routePath, cookie);
        expect([301, 302, 307, 308]).toContain(res.status);
        const location = res.headers.get('location') ?? '';
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

describe('admin-task5-6-guard preconditions', () => {
  it('reports why the suite ran or skipped', () => {
    console.log(
      `admin-task5-6-guard: env=${haveEnv ? 'present' : 'missing'} server=${up ? 'up' : 'down'} base=${BASE_URL}`
    );
    expect(true).toBe(true);
  });
});
