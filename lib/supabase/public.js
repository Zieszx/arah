// A Supabase client with NO session attached, for reading the public
// k-anonymised views.
//
// lib/supabase/server.js cannot be used for cached reads: it calls cookies(),
// and anything that reads a request's cookies cannot live inside
// unstable_cache — the value would be per-request by definition, which is
// the opposite of cacheable. It would also be wrong to cache a client bound
// to one visitor's session and serve it to another.
//
// This uses the anon key and no cookie plumbing at all, so it can only ever
// see what an anonymous visitor can see. That is exactly right for
// field_stats, field_detail_stats and advice_quotes, which are granted
// SELECT to anon precisely because they are the hardened, banded,
// suppression-aware views (migrations 0002/0007/0008/0009/0010). It must
// never be used for anything user-scoped — RLS would return nothing, which
// fails safe, but the intent matters more than the accident.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let cached = null;

export function createPublicClient() {
  // Module-scoped is safe here BECAUSE there is no per-request state to
  // close over — the opposite of server.js, whose comment warns against
  // exactly this for a cookie-bound client.
  if (cached) return cached;
  cached = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}
