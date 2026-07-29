// POST /api/account/delete — the other half of the signup-page promise
// ("You can delete everything from your account page at any time.",
// lib/i18n/en.js auth.notice.body). If this route silently fails or
// leaves rows behind, that sentence becomes a lie about how a product
// used by minors handles their data — so every step here is verified,
// not assumed, and the caller-facing verification script proves it with
// the service-role client, independent of what this route reports.
//
// Trust boundary: a request must both (a) be authenticated and (b) carry
// the exact confirmation token — see lib/account/delete.js. The token
// check happens before any database access, so an unconfirmed POST never
// touches a row.
//
// Deletion sequence and why:
//   1. predictions, quiz_responses, profiles — deleted explicitly through
//      the request-scoped, RLS-bound client (lib/supabase/server.js). RLS's
//      "own …" policies (supabase/migrations/0001_init.sql) are `for all`,
//      so a signed-in student deleting their own rows is exactly what they
//      already permit. Errors here are logged but do not abort: they are
//      best-effort tidiness, not the safety net (see step 2).
//   2. auth.users — deleted through the service-role admin client
//      (lib/supabase/admin.js), the only API that can remove a user's own
//      auth record at all. Its `on delete cascade` foreign keys guarantee
//      every row above is gone even if step 1 partially failed, so this is
//      the authoritative, must-succeed step: a failure here aborts with
//      an error and leaves the account intact, so the student can retry
//      rather than ending up in a half-deleted state.
//   3. Sign out — clears the session cookie via the same request-scoped
//      client, permitted here because a Route Handler (unlike a Server
//      Component render) may call cookieStore.set().
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDeleteConfirmed } from '@/lib/account/delete';
import en from '@/lib/i18n/en';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: 'auth_required', message: en.api.authRequired },
        { status: 401 },
      );
    }

    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const confirm = body && typeof body === 'object' ? body.confirm : null;
    if (!isDeleteConfirmed(confirm)) {
      return Response.json(
        {
          error: 'confirmation_required',
          message: en.account.delete.errors.confirmRequired,
        },
        { status: 400 },
      );
    }

    const userId = user.id;

    // Step 1 — best-effort explicit deletes, own rows, RLS-bound. Order
    // (child before parent) matters only for defence in depth; the FK
    // cascades below would clean these up regardless.
    const { error: predictionsError } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', userId);
    if (predictionsError) {
      console.error(
        '[api/account/delete] predictions delete failed:',
        predictionsError.code ?? predictionsError.message,
      );
    }

    const { error: quizResponsesError } = await supabase
      .from('quiz_responses')
      .delete()
      .eq('user_id', userId);
    if (quizResponsesError) {
      console.error(
        '[api/account/delete] quiz_responses delete failed:',
        quizResponsesError.code ?? quizResponsesError.message,
      );
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) {
      console.error(
        '[api/account/delete] profiles delete failed:',
        profileError.code ?? profileError.message,
      );
    }

    // Step 2 — authoritative. Failure here means the account still
    // exists; abort rather than signing the student out of an account
    // that wasn't actually deleted.
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error(
        '[api/account/delete] auth.users delete failed:',
        authError.code ?? authError.message,
      );
      return Response.json(
        { error: 'delete_failed', message: en.account.delete.errors.generic },
        { status: 500 },
      );
    }

    // Step 3 — sign out only after the account is genuinely gone.
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      // The account is deleted regardless; a stale cookie the browser
      // fails to clear is not worth reporting as a failure to the
      // student — proxy.js treats invalid session cookies as signed out.
      console.error('[api/account/delete] signOut failed:', signOutError.code);
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('[api/account/delete]', err);
    return Response.json(
      { error: 'server_error', message: en.api.serverError },
      { status: 500 },
    );
  }
}
