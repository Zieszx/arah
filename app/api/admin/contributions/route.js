// POST /api/admin/contributions — approve or reject one pending
// alumni_profiles row (Plan 5, Task 5).
//
// This is the actual trust boundary, not the page: app/(admin)/admin/
// contributions/page.jsx only decides whether to SHOW the approve/reject
// buttons, and a client that never rendered them can still POST here
// directly. So this route re-derives is_admin itself, from the DB, on
// every request — never trusting that the request "must" have come from
// the admin UI. Same two-step shape as requireAdmin() (lib/auth/
// requireAdmin.js): authenticate against the ordinary RLS-bound client
// first, THEN check is_admin — but this is a JSON API, not a page, so it
// returns 401/403 instead of redirect()ing (Next's redirect() throws a
// control-flow signal meant for page renders, not fetch() callers).
//
// The mutation itself (verified: true + approved_at/approved_by, or
// rejected_at/rejected_by — never a hard delete) lives in
// lib/admin/contributions.js, which uses the service-role client for the
// same reason every other admin data module does: alumni_profiles has no
// grants for anon/authenticated at all (0004_tighten_alumni_grants.sql).
import { createClient } from '@/lib/supabase/server';
import { approveContribution, rejectContribution } from '@/lib/admin/contributions';
import en from '@/lib/i18n/en';

const ACTIONS = { approve: approveContribution, reject: rejectContribution };

export async function POST(request) {
  try {
    // 1. Authenticate.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: 'auth_required', message: en.api.admin.authRequired },
        { status: 401 }
      );
    }

    // 2. Authorize — re-checked here, server-side, regardless of what the
    // UI did or didn't render. Fails closed: any error reading `profiles`
    // is treated as "not an admin" (same posture as requireAdmin()).
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError || !profile?.is_admin) {
      return Response.json(
        { error: 'forbidden', message: en.api.admin.forbidden },
        { status: 403 }
      );
    }

    // 3. Validate the body.
    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const id = body && typeof body.id === 'string' ? body.id : null;
    const action = body && typeof body.action === 'string' ? body.action : null;
    if (!id || !action || !(action in ACTIONS)) {
      return Response.json(
        { error: 'invalid_request', message: en.api.admin.invalidRequest },
        { status: 422 }
      );
    }

    // 4. Mutate.
    const result = await ACTIONS[action](id, user.id);
    if (!result.ok) {
      // Already approved/rejected by someone else, or the id never
      // existed — either way there is nothing pending to act on anymore.
      return Response.json(
        { error: 'not_pending', message: en.api.admin.notPending },
        { status: 409 }
      );
    }

    return Response.json({ ok: true, action }, { status: 200 });
  } catch (err) {
    console.error('[api/admin/contributions]', err);
    return Response.json(
      { error: 'server_error', message: en.api.serverError },
      { status: 500 }
    );
  }
}
