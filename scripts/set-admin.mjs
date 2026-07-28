/**
 * Grant the is_admin flag to a single user, by email. Service-role only:
 * there is no client-side path that can set is_admin (see
 * supabase/migrations/0005_profiles_admin.sql, which revokes that column
 * from the `authenticated` role's INSERT/UPDATE grants). This script is the
 * only sanctioned way to flip it, and it must be run by a human with the
 * service-role key, never invoked from application code.
 *
 * Env vars come from Node's native --env-file — do not re-add dotenv.
 *
 * Run: node --env-file=.env.development.local scripts/set-admin.mjs <email>
 */
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node --env-file=.env.development.local scripts/set-admin.mjs <email>');
  process.exit(1);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. ' +
      'This script refuses to run without the service-role key.'
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: listError } = await db.auth.admin.listUsers();
if (listError) throw listError;

const user = existing?.users?.find((u) => u.email === email);
if (!user) {
  console.error(`No user found with email ${email}`);
  process.exit(1);
}

const { data, error } = await db
  .from('profiles')
  .update({ is_admin: true })
  .eq('id', user.id)
  .select('id, is_admin');
if (error) throw error;
if (!data || data.length === 0) {
  console.error(`No profile row found for ${email} (${user.id}) — is the profile created?`);
  process.exit(1);
}

console.log(`is_admin=true set for ${email} (${user.id})`);
