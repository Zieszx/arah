/**
 * Create the demo account from .env.seed.local.
 * Uses email_confirm so no confirmation email is needed.
 *
 * Run: npm run seed:user
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.seed.local' });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;
const name = process.env.SEED_USER_NAME;

if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
if (!email || !password) throw new Error('.env.seed.local is missing SEED_USER_EMAIL/PASSWORD');

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await db.auth.admin.listUsers();
const found = existing?.users?.find((u) => u.email === email);

let userId;
if (found) {
  userId = found.id;
  await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
  console.log(`updated existing user ${email}`);
} else {
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`created user ${email}`);
}

const { error: pErr } = await db
  .from('profiles')
  .upsert({ id: userId, display_name: name }, { onConflict: 'id' });
if (pErr) throw pErr;
console.log(`profile ready — display_name="${name}"`);
