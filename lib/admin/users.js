// Data for /admin/users — the account list and its edit form.
//
// WHAT THIS DELIBERATELY DOES NOT EXPOSE: passwords. They are stored as
// salted hashes in auth.users and are not recoverable by anyone, including
// this console — there is no view that could show one. The account details
// here are identity and access facts (email, display name, role, whether the
// address is confirmed, when they last signed in), which is what "manage a
// user" actually needs. If a student cannot get in, the answer is a password
// reset they perform themselves, never an admin reading their password.
//
// Reads go through the service-role client because listing OTHER people's
// accounts is exactly what RLS forbids for an ordinary session, and
// auth.users is not reachable from PostgREST at all — only the Admin API can
// enumerate it. Every caller is behind requireAdmin().
//
// The two sources are joined in memory by id: auth.users has no PostgREST
// foreign key to profiles, so there is no single query that could return
// both.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { pageCount } from '@/lib/admin/pagination';

/**
 * One page of accounts, newest first.
 *
 * Returns { rows, total, page, pageCount } or null on failure. Each row:
 * { id, email, displayName, isAdmin, confirmed, createdAt, lastSignInAt,
 *   submissionCount }
 */
export async function getUsersPage({ page = 1, pageSize = 25 } = {}) {
  const supabase = createAdminClient();
  try {
    // The Admin API pages 1-based with its own perPage, which lines up with
    // this module's contract directly.
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (error) throw error;

    const users = data?.users ?? [];
    // listUsers reports the total when the backend provides it; fall back to
    // "at least what we can see" rather than claiming a total we don't have.
    const total =
      typeof data?.total === 'number'
        ? data.total
        : (page - 1) * pageSize + users.length;

    const ids = users.map((u) => u.id);
    const [profiles, submissionCounts] = await Promise.all([
      fetchProfiles(supabase, ids),
      countSubmissions(supabase, ids),
    ]);

    const rows = users.map((user) => {
      const profile = profiles.get(user.id);
      return {
        id: user.id,
        email: user.email ?? null,
        displayName: profile?.display_name ?? null,
        isAdmin: profile?.is_admin === true,
        confirmed: Boolean(user.email_confirmed_at),
        createdAt: user.created_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        submissionCount: submissionCounts.get(user.id) ?? 0,
      };
    });

    return { rows, total, page, pageCount: pageCount(total, pageSize) };
  } catch (error) {
    console.error('admin users: list failed:', error?.code ?? error?.message);
    return null;
  }
}

async function fetchProfiles(supabase, ids) {
  const byId = new Map();
  if (ids.length === 0) return byId;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, is_admin')
    .in('id', ids);
  if (error) throw error;
  for (const row of data ?? []) byId.set(row.id, row);
  return byId;
}

// One grouped count would be nicer, but PostgREST cannot group without a
// view, and this page is at most `pageSize` ids wide.
async function countSubmissions(supabase, ids) {
  const counts = new Map();
  if (ids.length === 0) return counts;
  const { data, error } = await supabase
    .from('quiz_responses')
    .select('user_id')
    .in('user_id', ids);
  if (error) throw error;
  for (const row of data ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return counts;
}

/** How many admins exist right now. Used to refuse removing the last one. */
export async function countAdmins() {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_admin', true);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Update one account's editable fields.
 *
 * `isAdmin` is a privilege change, so it is guarded twice here rather than
 * trusted to the UI: an admin cannot demote themselves (that is a lock-out
 * one click away, with no way back through the interface), and the last
 * remaining admin cannot be demoted by anyone (that locks EVERYONE out and
 * would need a database console to undo).
 *
 * Returns { ok: true } or { ok: false, reason }.
 */
export async function updateUserProfile({ id, displayName, isAdmin, actorId }) {
  if (typeof id !== 'string' || !id) return { ok: false, reason: 'invalid' };

  const supabase = createAdminClient();
  try {
    const { data: current, error: readError } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', id)
      .maybeSingle();
    if (readError) throw readError;
    if (!current) return { ok: false, reason: 'missing' };

    const wantsDemotion = current.is_admin === true && isAdmin === false;
    if (wantsDemotion) {
      if (id === actorId) return { ok: false, reason: 'self_demote' };
      if ((await countAdmins()) <= 1) return { ok: false, reason: 'last_admin' };
    }

    const patch = {};
    if (typeof displayName === 'string') {
      const trimmed = displayName.trim();
      // Stored as null rather than '' so every reader's `?? fallback` works.
      patch.display_name = trimmed === '' ? null : trimmed.slice(0, 80);
    }
    if (typeof isAdmin === 'boolean') patch.is_admin = isAdmin;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch (error) {
    console.error('admin users: update failed:', error?.code ?? error?.message);
    return { ok: false, reason: 'failed' };
  }
}
