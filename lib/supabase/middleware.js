// Supabase client for proxy.js (Next.js 16 renamed the `middleware.js` file
// convention to `proxy.js` -- see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
// and the "Next.js 16" note in this repo's root proxy.js). This file keeps
// the Supabase-specific cookie plumbing out of proxy.js itself.
//
// This is the one context that both reads AND must reliably write cookies on
// every request: proxy.js runs before rendering, on every navigation, so
// it's the only place a refreshed access token is guaranteed to be persisted
// back to the browser. If this client's setAll is wrong or skipped, session
// refresh silently breaks -- the @supabase/ssr createServerClient docstring
// calls this out explicitly (node_modules/@supabase/ssr/dist/main/createServerClient.d.ts).
//
// Cookies must be written to BOTH the outgoing NextRequest (so this same
// request sees the refreshed session if it reads cookies again downstream)
// and a freshly-constructed NextResponse (so the browser receives the
// Set-Cookie header) -- copying options onto a response created before the
// request mutation is a well-known way to lose the refreshed cookies.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add logic between createServerClient and getUser(): anything in
  // between risks the auth cookie's refresh never being written back
  // (@supabase/ssr's own warning), which manifests as random logouts.
  //
  // getUser() (not getSession()) is required here because it revalidates the
  // token against Supabase Auth rather than trusting whatever is in the
  // cookie -- proxy.js is exactly the kind of security-relevant check where
  // an unverified, possibly-stale cookie value must not be trusted.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
