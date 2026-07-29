// The one gate every admin page must pass through.
//
// proxy.js already redirects an unauthenticated request away from /admin
// (PROTECTED_PREFIXES includes it), but that check is optimistic —
// cookie-only, no per-route DB round trip (see the comment at the top of
// proxy.js and node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Optimistic checks with Proxy"). It also has no idea what `is_admin`
// is. This helper is the real, DB-verified check, and it is deliberately
// NOT trusted to run only once per visit: node_modules/next/dist/docs/
// .../authentication.md's "Layouts and auth checks" section warns that a
// shared layout does not re-render on client-side navigation between
// sibling routes it wraps, so a check placed only in
// app/(admin)/layout.jsx would not re-verify on every admin-to-admin
// navigation. Every admin page.jsx therefore calls requireAdmin() itself,
// in addition to the layout calling it for the header's data — both calls
// land in the same request's React `cache()` bucket (see
// lib/supabase/viewer.js for the identical pattern), so this costs one
// profiles read per request, not one per call site.
//
// Two distinct failure modes, two distinct destinations:
//   - not signed in       -> /login?next=/admin (never renders the shell)
//   - signed in, not admin -> / (quietly returned home, never invited to
//     try credentials for an area they were never meant to find)
//
// Fails closed: any error reading `profiles` is treated as "not an
// admin", same posture as lib/supabase/viewer.js#getViewer. Worst case an
// actual admin sees a spurious redirect to `/`, never the reverse.
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const requireAdmin = cache(async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Defence in depth only — in normal operation proxy.js has already
    // redirected this request before requireAdmin() ever runs. This
    // covers the narrow window where the two checks could disagree (e.g.
    // a token that expired between the proxy hop and this render).
    redirect('/login?next=/admin');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, display_name, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('requireAdmin profiles read failed:', error.code);
    redirect('/');
  }
  if (!profile?.is_admin) {
    redirect('/');
  }

  // The page/layout gets everything it needs from one read: id and
  // display_name so AdminHeader never has to re-query, plus the email
  // off the auth user (profiles has no email column of its own).
  return { ...profile, email: user.email ?? null };
});

export default requireAdmin;
