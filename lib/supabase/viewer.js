// Who is looking at this page — shared by the site header and footer.
//
// Server-only on purpose: the admin decision must be made before HTML is
// serialised, never in the browser. A student's page must not merely hide
// the admin entry — the markup must never be rendered at all (Task 7's
// security requirement), and that is only enforceable server-side.
//
// Wrapped in React's cache() so the header and the footer — two separate
// Server Components rendered in the same request — share one auth
// validation and one profiles read instead of each paying for their own
// (see node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Auth and streaming": run getUser() in a parent/server component and
// dedupe with React.cache).
//
// Fail closed: any error reading profiles is treated as "not an admin".
// A signed-in viewer we cannot positively confirm as admin gets no admin
// entry — worst case an actual admin sees less chrome, never the reverse.
import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getViewer = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    // Server log only; the page renders as a plain signed-in student.
    console.error('viewer profiles read failed:', error.code);
    return { user, isAdmin: false };
  }
  return { user, isAdmin: data?.is_admin === true };
});
