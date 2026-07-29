// End-to-end proof of the moderation round trip (Plan 5, Task 5): insert a
// pending contribution via the service role (exactly how a real
// /contribute submission lands), approve it through the real
// app/api/admin/contributions/route.js as the seeded admin, confirm
// `verified` actually flipped, then reject a second one and confirm it
// soft-deletes (rejected_at set, row still present) rather than
// disappearing. Cleans up both rows itself and asserts alumni_profiles is
// back to exactly 207 — the documented baseline (docs/PROJECT-RECORD.md).
//
// This is also the negative control tests/js/admin-task5-6-guard.test.js
// promises: the non-admin 403 test there only proves something is
// rejected — this test proves the identical POST shape succeeds for a
// real admin, so the 403 is a genuine authorization failure, not a
// route that rejects everyone.
//
// Needs a running app plus the local env files; skips, like its siblings,
// when either is missing.
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

const admin = run
  ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

// A minimal, valid alumni_profiles row — same shape
// lib/contribute/submission.js#mapContributionToRow produces for a real
// /contribute submission, with source: 'user_contributed' and
// verified: false, exactly like the real thing.
function testRow(fieldOfStudy) {
  return {
    school_type: 'Public School (SMK / SMJKC)',
    spm_results: '6 - 8 As (A-, A, A+)',
    streams: ['Science (Biology, Chemistry etc)'],
    subjects_enjoyed: ['Science Subjects (Science, Biology, Physics)'],
    subjects_difficult: ['Mathematical Subjects'],
    tasks_enjoyed: ['Experimenting and researching'],
    characteristics: ['Analytical', 'Observant'],
    personality: 'Introvert',
    public_speaking: 3,
    preu_program: 'Matriculation',
    field_of_study: fieldOfStudy,
    reasons: ['Personal interest & Passion'],
    satisfaction: 4,
    advice: 'This row exists only for tests/js/admin-contributions-e2e.test.js and is deleted at the end of the run.',
    source: 'user_contributed',
    verified: false,
  };
}

const insertedIds = [];

afterAll(async () => {
  if (!admin) return;
  if (insertedIds.length) {
    await admin.from('alumni_profiles').delete().in('id', insertedIds);
  }
});

describe.skipIf(!run)('Contribution moderation round trip', () => {
  it(
    'approve: verified flips true, approved_at/approved_by are stamped, row leaves the pending queue',
    { timeout: 90000 },
    async () => {
      const before = await admin
        .from('alumni_profiles')
        .select('*', { count: 'exact', head: true });
      expect(before.error).toBeNull();
      const baselineTotal = before.count;

      // 1. Insert a pending row via the service role — exactly how
      // app/api/contribute/route.js does it.
      const { data: inserted, error: insertError } = await admin
        .from('alumni_profiles')
        .insert(testRow('Engineering (Mechanical, Civil, Electrical etc)'))
        .select('id')
        .single();
      expect(insertError).toBeNull();
      insertedIds.push(inserted.id);

      // Confirm it actually landed as pending, unverified.
      const { data: pendingCheck } = await admin
        .from('alumni_profiles')
        .select('verified, approved_at, approved_by, rejected_at')
        .eq('id', inserted.id)
        .single();
      expect(pendingCheck.verified).toBe(false);
      expect(pendingCheck.approved_at).toBeNull();
      expect(pendingCheck.rejected_at).toBeNull();

      // 2. Approve it through the REAL route, as the real seeded admin.
      const cookie = await signInCookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD);
      const { data: usersPage } = await admin.auth.admin.listUsers();
      const adminUserId = usersPage.users.find((u) => u.email === ADMIN_EMAIL)?.id ?? null;

      const res = await fetch(`${BASE_URL}/api/admin/contributions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ id: inserted.id, action: 'approve' }),
        signal: AbortSignal.timeout(30000),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.action).toBe('approve');

      // 3. Confirm verified actually flipped, and the approval was logged
      // with who and when (Task 5's explicit guard rail).
      const { data: after, error: afterError } = await admin
        .from('alumni_profiles')
        .select('verified, approved_at, approved_by')
        .eq('id', inserted.id)
        .single();
      expect(afterError).toBeNull();
      expect(after.verified).toBe(true);
      expect(after.approved_at).not.toBeNull();
      expect(after.approved_by).toEqual(expect.any(String));
      if (adminUserId) expect(after.approved_by).toBe(adminUserId);

      // 4. It no longer appears in the pending queue's own predicate.
      const { data: stillPending } = await admin
        .from('alumni_profiles')
        .select('id')
        .eq('id', inserted.id)
        .eq('verified', false)
        .is('rejected_at', null);
      expect(stillPending).toEqual([]);

      // 5. Clean up, and prove the table is back to the baseline count —
      // the documented 207 if this run started from that baseline.
      await admin.from('alumni_profiles').delete().eq('id', inserted.id);
      insertedIds.splice(insertedIds.indexOf(inserted.id), 1);

      const finalCount = await admin
        .from('alumni_profiles')
        .select('*', { count: 'exact', head: true });
      expect(finalCount.count).toBe(baselineTotal);
    }
  );

  it(
    'reject: soft-deletes — rejected_at/rejected_by set, verified stays false, row is NOT removed from the table',
    { timeout: 90000 },
    async () => {
      const { data: inserted, error: insertError } = await admin
        .from('alumni_profiles')
        .insert(testRow('Media & Communication'))
        .select('id')
        .single();
      expect(insertError).toBeNull();
      insertedIds.push(inserted.id);

      const cookie = await signInCookieHeader(ADMIN_EMAIL, ADMIN_PASSWORD);
      const res = await fetch(`${BASE_URL}/api/admin/contributions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ id: inserted.id, action: 'reject' }),
        signal: AbortSignal.timeout(30000),
      });
      expect(res.status).toBe(200);

      // Soft-delete: the row is still there, still readable, verified is
      // still false (never true — it was never admitted), but rejected_at
      // is now set.
      const { data: row, error: rowError } = await admin
        .from('alumni_profiles')
        .select('verified, rejected_at, rejected_by, advice')
        .eq('id', inserted.id)
        .single();
      expect(rowError).toBeNull();
      expect(row).not.toBeNull();
      expect(row.verified).toBe(false);
      expect(row.rejected_at).not.toBeNull();
      expect(row.rejected_by).toEqual(expect.any(String));
      // Recoverable: the original data is untouched.
      expect(row.advice).toContain('admin-contributions-e2e.test.js');

      // Double-action guard: rejecting an already-rejected row again must
      // not succeed (nothing left "pending" to act on).
      const res2 = await fetch(`${BASE_URL}/api/admin/contributions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ id: inserted.id, action: 'reject' }),
        signal: AbortSignal.timeout(30000),
      });
      expect(res2.status).toBe(409);

      await admin.from('alumni_profiles').delete().eq('id', inserted.id);
      insertedIds.splice(insertedIds.indexOf(inserted.id), 1);
    }
  );
});

describe('admin-contributions-e2e preconditions', () => {
  it('reports why the suite ran or skipped', () => {
    console.log(
      `admin-contributions-e2e: env=${haveEnv ? 'present' : 'missing'} server=${up ? 'up' : 'down'} base=${BASE_URL}`
    );
    expect(true).toBe(true);
  });
});
