// Supabase client for Server Components, Server Actions and Route Handlers.
//
// Reads cookies via next/headers `cookies()`, which is async in Next.js 16
// (see node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md).
// `cookieStore.set` can only succeed when called from a Server Action or
// Route Handler -- calling it during a Server Component render throws, which
// is why setAll is wrapped in try/catch below. That's fine here because
// proxy.js (via lib/supabase/middleware.js) already refreshes the session
// cookie on every request, so a Server Component that can't persist a
// refreshed token isn't the last line of defence.
//
// Always call createClient() fresh per request -- never module-scope the
// client -- since it closes over this request's cookie store.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component during render -- cookies can't
            // be written here. Safe to ignore because proxy.js refreshes the
            // session on every request via lib/supabase/middleware.js.
          }
        },
      },
    }
  );
}
