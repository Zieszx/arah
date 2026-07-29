// Shared chrome for /login and /signup — the §5c sliding overlay shell
// (docs/design/visual-design-system.md). Both forms now live here, in the
// layout, rather than in each route's own page.jsx: a Next.js layout is not
// remounted when navigating between sibling routes it wraps
// (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-pathname.md,
// "a Client Component with usePathname... does not need to be re-fetched...
// re-renders based on current state"). Rendering the forms from page.jsx
// instead would mean React tears the whole tree down and rebuilds it on
// every /signup ↔ /login navigation — nothing to animate a transform on,
// which is fatal to "the panel is what moves; the forms do not." Putting
// them in the layout keeps one persistent set of DOM nodes that AuthShell
// (a Client Component reading usePathname()) simply re-renders in place.
//
// /signup and /login remain real, addressable routes purely so each keeps
// its own <title> via page.jsx's `metadata` export — see the comment there
// for why those files render nothing themselves.
//
// Quotes: fetched here, once per full page load, from the SECURITY DEFINER
// view in supabase/migrations/0007_advice_quotes.sql — advice text only,
// never joined back to field_of_study or any other alumni_profiles column
// (§5c's non-negotiable privacy constraint). Picking two up front and
// holding them for the session (rather than letting the client re-roll on
// every panel flip) means the same two quotes stay stable while a student
// toggles back and forth within one visit.
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import AuthShell from './auth-shell.jsx';

async function fetchQuotes() {
  const supabase = await createClient();
  // Pull a small pool and shuffle in JS rather than `order by random()`:
  // the view is only 68 rows, and a client-side Fisher-Yates avoids an
  // unnecessary sequential-scan-with-sort in Postgres on every page load.
  const { data, error } = await supabase.from('advice_quotes').select('advice').limit(40);
  if (error || !data || data.length === 0) {
    // A quote is a nice-to-have for the panel, not load-bearing — if the
    // view is briefly unreachable, the auth page still has to work.
    if (error) console.error('advice_quotes fetch failed:', error.code ?? error.message);
    return [];
  }
  const pool = [...data];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 2).map((row) => row.advice);
}

export default async function AuthLayout({ children }) {
  const quotes = await fetchQuotes();

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-6 py-12 md:px-16 md:py-24">
      {/* useSearchParams() inside AuthShell requires a Suspense boundary
          when a route can be statically prerendered
          (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md,
          "Prerendering"). These routes read cookies() above, which already
          forces dynamic rendering, so in practice the fallback is never
          seen — this exists to satisfy the build-time check either way. */}
      <Suspense fallback={null}>
        <AuthShell quotes={quotes}>{children}</AuthShell>
      </Suspense>
    </main>
  );
}
