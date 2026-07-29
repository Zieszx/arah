// Service-role Supabase client — SERVER ONLY.
//
// The service-role key bypasses RLS and every column grant in the project.
// If it ever reached a client bundle, every policy in supabase/migrations/
// would become decorative. Two lines of defence:
//
// 1. `import 'server-only'` makes any import of this module from client
//    code a BUILD error, not a silent leak (the package throws when
//    bundled for the browser).
// 2. tests/js/service-role-leak.test.js greps the built .next/static
//    output for the key's value as a permanent regression guard.
//
// Used for exactly two things, both genuinely requiring the admin API
// rather than RLS:
//   1. creating a new account already email-confirmed at signup (product
//      decision — ARAH never sends mail, the address is only an
//      identifier, so a confirmation wait is pure funnel loss for a
//      17-year-old; and the admin path, unlike anon signUp(), never
//      queues a confirmation email at all);
//   2. deleting the auth.users row itself in app/api/account/delete —
//      there is no self-service "delete my own auth user" call in
//      @supabase/supabase-js, only auth.admin.deleteUser(). The row's
//      dependents (profiles, quiz_responses, predictions — all
//      `on delete cascade`, supabase/migrations/0001_init.sql) are
//      deleted through the ordinary RLS-bound request client first; this
//      client's cascade is the final, authoritative cleanup, not the
//      primary mechanism.
// Keep this module's surface minimal; anything else user-scoped belongs
// on the RLS-bound clients in client.js / server.js.
//
// Created fresh per call, never module-scoped, and with session
// persistence off: this client must never hold or refresh a user session.
import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase admin client is missing its environment');
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
