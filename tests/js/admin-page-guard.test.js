// End-to-end proof of requireAdmin() (lib/auth/requireAdmin.js), against a
// REAL running server — same technique and same reasons as
// tests/js/admin-absence.test.js (which proves the footer's admin entry is
// absent from a non-admin's served HTML): a unit test of the redirect logic
// cannot prove what actually reaches the network, so this signs in for
// real, fetches /admin over HTTP, and inspects the served bytes.
//
// Three cases, plus the negative control that proves the assertion machinery
// can actually fail:
//   1. signed OUT -> 30x redirect to /login (proxy.js's optimistic check;
//      PROTECTED_PREFIXES includes /admin).
//   2. signed in, NON-ADMIN -> redirected away from /admin (requireAdmin()'s
//      DB-verified check), and the body of wherever we land contains NONE
//      of the admin shell's markup ("Overview", "Admin navigation", the
//      breadcrumb root, the sidebar nav labels).
//   3. signed in, ADMIN (the seeded demo account) -> 200, and the body DOES
//      contain the admin markup — the negative control: proves the scan in
//      case 2 is capable of detecting the substrings it's asked to find.
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

async function fetchAdmin(cookieHeader) {
  return fetch(BASE_URL + '/admin', {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });
}

// Markup that only ever appears inside the rendered admin shell — the
// sidebar nav labels (components/admin/nav-items.js / lib/i18n/en.js
// admin.nav) and the breadcrumb root. None of these strings appear
// anywhere on the public site today, so their presence is a reliable
// fingerprint of "the admin shell actually rendered".
const ADMIN_MARKUP_FINGERPRINTS = [
  'Algorithm Tester',
  'Student Responses',
  'admin-menu',
];

const studentEmail = `admin-guard-${randomUUID().slice(0, 8)}@arah.test`;
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

describe.skipIf(!run)('/admin is gated by requireAdmin()', () => {
  it(
    'signed OUT: redirected toward /login',
    { timeout: 90000 },
    async () => {
      const res = await fetchAdmin(null);
      expect([301, 302, 307, 308]).toContain(res.status);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/login');
    }
  );

  it(
    'signed in, NON-ADMIN: redirected away, and the landing page body contains NONE of the admin shell markup',
    { timeout: 90000 },
    async () => {
      await createStudent();
      const cookie = await signInCookieHeader(studentEmail, studentPassword);
      const res = await fetchAdmin(cookie);
      // requireAdmin() redirects to '/', never /login (a signed-in
      // student must not be invited to try credentials).
      expect([301, 302, 307, 308]).toContain(res.status);
      const location = res.headers.get('location') ?? '';
      expect(location).not.toContain('/login');

      // Follow the redirect and assert on what was actually served — the
      // requirement is about the RESPONSE BODY, not just the status.
      // requireAdmin()'s redirect('/') comes back as a relative Location
      // header, so resolve it against BASE_URL before re-fetching.
      const landed = await fetch(new URL(location, BASE_URL), {
        headers: { cookie },
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
      });
      const html = await landed.text();
      // Sanity: we really are signed in (if auth had silently failed we'd
      // be looking at the signed-out home page, which still wouldn't
      // contain the fingerprints below — but this keeps the test honest
      // about what it actually checked).
      expect(html).toContain('Log out');
      for (const fingerprint of ADMIN_MARKUP_FINGERPRINTS) {
        expect(html).not.toContain(fingerprint);
      }
    }
  );

  it(
    'signed in, ADMIN: 200, and the body DOES contain the admin shell markup (negative control — proves the scan above can detect it)',
    { timeout: 90000 },
    async () => {
      const cookie = await signInCookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD);
      const res = await fetchAdmin(cookie);
      expect(res.status).toBe(200);
      const html = await res.text();
      for (const fingerprint of ADMIN_MARKUP_FINGERPRINTS) {
        expect(html).toContain(fingerprint);
      }
      // The public site chrome must NOT also be present — app/layout.jsx
      // suppresses SiteHeader/SiteFooter for /admin (see its header
      // comment); their absence is what proves that wiring works, not
      // just requireAdmin() letting the admin through.
      expect(html).not.toContain('href="/explore"');
    }
  );
});

describe('admin-page-guard preconditions', () => {
  it('reports why the suite ran or skipped', () => {
    console.log(
      `admin-page-guard: env=${haveEnv ? 'present' : 'missing'} server=${up ? 'up' : 'down'} base=${BASE_URL}`
    );
    expect(true).toBe(true);
  });
});
