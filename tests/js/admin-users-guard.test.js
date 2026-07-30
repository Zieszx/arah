// The privilege guards in lib/admin/users.js#updateUserProfile.
//
// Two lock-outs are one click apart on that screen and neither is
// recoverable through the interface: an admin demoting themselves, and the
// last admin being demoted by anyone. Both are refused in the data layer,
// not only by a disabled checkbox — a Server Action is a POST endpoint the
// moment it ships, so a disabled control in the UI is a courtesy, never a
// control.
//
// Supabase is faked here rather than reached: these are decisions, and the
// decisions are what must not regress.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// lib/admin/users.js starts with `import 'server-only'`, which throws
// outside a Server Component render. Same stub the other admin data-layer
// tests use (tests/js/admin-overview.test.js, require-admin.test.js).
vi.mock('server-only', () => ({}));

let profileRow;
let adminCount;
let updates;

function makeQuery(table) {
  const q = {
    _table: table,
    _filters: {},
    select() {
      return q;
    },
    eq(column, value) {
      q._filters[column] = value;
      return q;
    },
    async maybeSingle() {
      return { data: profileRow, error: null };
    },
    update(patch) {
      updates.push({ table, patch });
      return {
        eq: async () => ({ error: null }),
      };
    },
    // `select('id', { count: 'exact', head: true }).eq('is_admin', true)`
    then(resolve) {
      return resolve({ count: adminCount, error: null });
    },
  };
  return q;
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: (table) => makeQuery(table) }),
}));

const { updateUserProfile } = await import('@/lib/admin/users');

const ADMIN_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const ADMIN_B = 'bbbbbbbb-0000-0000-0000-000000000002';

beforeEach(() => {
  updates = [];
  adminCount = 2;
  profileRow = { id: ADMIN_A, is_admin: true };
});

describe('updateUserProfile — lock-out guards', () => {
  it('refuses to let an admin remove their own access', async () => {
    const result = await updateUserProfile({
      id: ADMIN_A,
      isAdmin: false,
      actorId: ADMIN_A,
    });
    expect(result).toEqual({ ok: false, reason: 'self_demote' });
    expect(updates).toHaveLength(0);
  });

  it('refuses to demote the last remaining admin', async () => {
    adminCount = 1;
    const result = await updateUserProfile({
      id: ADMIN_A,
      isAdmin: false,
      actorId: ADMIN_B,
    });
    expect(result).toEqual({ ok: false, reason: 'last_admin' });
    expect(updates).toHaveLength(0);
  });

  it('allows one admin to demote another when others remain', async () => {
    adminCount = 3;
    const result = await updateUserProfile({
      id: ADMIN_A,
      isAdmin: false,
      actorId: ADMIN_B,
    });
    expect(result).toEqual({ ok: true });
    expect(updates[0].patch).toMatchObject({ is_admin: false });
  });

  it('never blocks a PROMOTION — the guards are about removing access', async () => {
    profileRow = { id: ADMIN_A, is_admin: false };
    adminCount = 1;
    const result = await updateUserProfile({
      id: ADMIN_A,
      isAdmin: true,
      actorId: ADMIN_A,
    });
    expect(result).toEqual({ ok: true });
    expect(updates[0].patch).toMatchObject({ is_admin: true });
  });

  it('lets an admin edit their own display name — only the role is locked', async () => {
    const result = await updateUserProfile({
      id: ADMIN_A,
      displayName: 'Nuha',
      actorId: ADMIN_A,
    });
    expect(result).toEqual({ ok: true });
    expect(updates[0].patch).toEqual({ display_name: 'Nuha' });
  });
});

describe('updateUserProfile — input handling', () => {
  it('rejects a missing id rather than updating something arbitrary', async () => {
    expect(await updateUserProfile({ id: '', actorId: ADMIN_A })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(await updateUserProfile({ id: undefined, actorId: ADMIN_A })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(updates).toHaveLength(0);
  });

  it('reports a missing account instead of silently succeeding', async () => {
    profileRow = null;
    const result = await updateUserProfile({ id: ADMIN_A, displayName: 'x', actorId: ADMIN_B });
    expect(result).toEqual({ ok: false, reason: 'missing' });
  });

  it('stores a blank display name as null, not an empty string', async () => {
    // Every reader falls back with `?? 'No display name set'`, which an
    // empty string would defeat.
    await updateUserProfile({ id: ADMIN_A, displayName: '   ', actorId: ADMIN_A });
    expect(updates[0].patch).toEqual({ display_name: null });
  });

  it('trims and caps an over-long display name', async () => {
    await updateUserProfile({
      id: ADMIN_A,
      displayName: `  ${'x'.repeat(200)}  `,
      actorId: ADMIN_A,
    });
    expect(updates[0].patch.display_name).toHaveLength(80);
  });

  it('writes nothing when neither field was supplied', async () => {
    const result = await updateUserProfile({ id: ADMIN_A, actorId: ADMIN_A });
    expect(result).toEqual({ ok: true });
    expect(updates).toHaveLength(0);
  });

  it('ignores a non-boolean isAdmin rather than coercing it', async () => {
    // "false" the string is truthy; coercing it would grant access.
    await updateUserProfile({ id: ADMIN_A, isAdmin: 'false', actorId: ADMIN_B });
    expect(updates[0]?.patch ?? {}).not.toHaveProperty('is_admin');
  });
});
