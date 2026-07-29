// Unit tests for lib/auth/requireAdmin.js's three branches. The
// end-to-end proof against a real server lives in
// tests/js/admin-page-guard.test.js; this file pins the DECISION LOGIC
// itself against a mocked Supabase client, independent of a running app.
//
// next/navigation's redirect() throws by design (Next's own docs: "on
// success each action calls redirect(), which throws NEXT_REDIRECT" —
// see app/(auth)/actions.js's header comment) — the mock below reproduces
// that so each test can assert both WHICH destination was chosen and
// that execution actually stopped there (nothing after the redirect ran).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// requireAdmin.js itself starts with `import 'server-only'`. That package
// throws unless resolved under a bundler's "react-server" condition
// (Next's compiler does this at the 'use client'/'use server' boundary);
// plain Vitest doesn't, so it's stubbed to a no-op here — the exact same
// problem and fix tests/js/auth-shell.test.js documents for the same
// package pulled in transitively through lib/supabase/admin.js.
vi.mock('server-only', () => ({}));

const redirectMock = vi.fn((url) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createClientMock = vi.fn(async () => ({
  auth: { getUser: getUserMock },
  from: fromMock,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }));

const { default: requireAdmin } = await import('@/lib/auth/requireAdmin.js');

describe('requireAdmin()', () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getUserMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('not signed in -> redirects to /login?next=/admin, never renders the shell', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/login?next=/admin');
    expect(redirectMock).toHaveBeenCalledTimes(1);
    // The profiles table must never be queried for a signed-out request.
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('signed in, ordinary student -> redirects to / (never /login)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'student@x.test' } } });
    maybeSingleMock.mockResolvedValue({
      data: { id: 'u1', display_name: 'Student', is_admin: false },
      error: null,
    });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('profiles read errors -> fails closed, redirects to / (never treats an error as admin)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'x@x.test' } } });
    maybeSingleMock.mockResolvedValue({ data: null, error: { code: 'PGRST000' } });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
  });

  it('missing profile row -> fails closed, redirects to /', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'u1', email: 'x@x.test' } } });
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    await expect(requireAdmin()).rejects.toThrow('REDIRECT:/');
  });

  it('signed in admin -> returns the profile, no redirect', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'u1', email: 'nuhaaa@arah.app' } },
    });
    maybeSingleMock.mockResolvedValue({
      data: { id: 'u1', display_name: 'Nuha', is_admin: true },
      error: null,
    });
    const profile = await requireAdmin();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(profile).toEqual({
      id: 'u1',
      display_name: 'Nuha',
      is_admin: true,
      email: 'nuhaaa@arah.app',
    });
  });
});
