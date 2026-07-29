// Task 7's security requirement, proven against the SERVED document.
//
// The footer's admin entry must be decided server-side:
//   - signed out            → the entry links to /login?next=/admin
//   - signed in, admin      → the entry links to /admin
//   - signed in, non-admin  → the element is NOT rendered AT ALL
//
// The third row is the one that matters: `display: none` or `hidden`
// would still ship the markup, and anyone who opens devtools would learn
// an admin area exists and where it lives. So this test doesn't inspect
// components — it signs in as a real non-admin student, fetches a page
// over HTTP, and asserts the response body contains no '/admin' substring
// anywhere (markup, RSC flight payload, anything). Then it does the same
// as the admin account and asserts the substring IS there, and as a
// signed-out visitor as the negative control proving the scan can detect
// the substring when present.
//
// Needs a running app (next dev or next start) plus the local env files;
// skips — like service-role-leak.test.js — when either is missing, so a
// fresh clone can still run `npm test`. The verification flow runs it
// against a live server. Base URL override: ARAH_BASE_URL.
//
// The non-admin student is created fresh (service role, same mechanism as
// scripts/seed-user.mjs) and deleted afterwards; the admin is the seeded
// demo account from .env.seed.local, whose is_admin was granted by a
// human via scripts/set-admin.mjs.
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

/**
 * Sign in with the password grant and return a Cookie header string in
 * EXACTLY the format the app's own server client reads: @supabase/ssr
 * does the encoding and chunking itself via the setAll callback — no
 * hand-rolled cookie format that could drift from production.
 */
async function signInCookieHeader(email, password) {
  const jar = new Map();
  const supabase = createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () =>
        Array.from(jar, ([name, value]) => ({ name, value })),
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

async function fetchHome(cookieHeader) {
  const res = await fetch(BASE_URL + '/', {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
  expect(res.status).toBe(200);
  return res.text();
}

// Ephemeral non-admin student, created/removed via the service role.
const studentEmail = `chrome-absence-${randomUUID().slice(0, 8)}@arah.test`;
const studentPassword = `Absence-${randomUUID()}`;
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
  // Profile row with the default is_admin = false — a plain student.
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

describe.skipIf(!run)('footer admin entry in the served HTML', () => {
  it(
    'signed-in NON-ADMIN: the document contains no /admin substring at all',
    { timeout: 90000 },
    async () => {
      await createStudent();
      const cookie = await signInCookieHeader(studentEmail, studentPassword);
      const html = await fetchHome(cookie);
      // Sanity: the cookie really authenticated us — the header shows the
      // signed-in action. (If auth had silently failed we'd be looking at
      // the signed-out page, which CONTAINS /admin — the assertion below
      // would fail loudly, never pass by accident.)
      expect(html).toContain('Log out');
      // The security requirement: absent from the served bytes entirely.
      expect(html).not.toContain('/admin');
    }
  );

  it(
    'signed-in ADMIN: the entry is present and links to /admin',
    { timeout: 90000 },
    async () => {
      const cookie = await signInCookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD);
      const html = await fetchHome(cookie);
      expect(html).toContain('Log out');
      expect(html).toContain('href="/admin"');
    }
  );

  it(
    'negative control — signed OUT: the scan detects /admin (via the login gate link), proving the non-admin assertion can fail',
    { timeout: 90000 },
    async () => {
      const html = await fetchHome(null);
      expect(html).toContain('Log in');
      // Same substring the non-admin test forbids — present here, so the
      // machinery demonstrably can detect it in a served document.
      expect(html).toContain('/admin');
      expect(html).toContain('/login?next=/admin');
    }
  );
});

// Always-on guard: if the env/server is missing this file must SKIP, not
// silently pass while asserting nothing.
describe('admin-absence preconditions', () => {
  it('reports why the suite ran or skipped', () => {
    console.log(
      `admin-absence: env=${haveEnv ? 'present' : 'missing'} server=${up ? 'up' : 'down'} base=${BASE_URL}`
    );
    expect(true).toBe(true);
  });
});
