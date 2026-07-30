// Next.js 16 renamed the `middleware.js` file convention to `proxy.js`; the
// old name is deprecated (still works, but logs a build-time warning) --
// see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md,
// "Migration to Proxy" / version history for v16.0.0, and AGENTS.md's
// instruction to heed deprecation notices. Behavior and API are otherwise
// unchanged from what this repo's docs still call "middleware" elsewhere.
//
// Runs on every request (subject to `config.matcher` below): refreshes the
// Supabase session cookie via lib/supabase/middleware.js, then redirects
// unauthenticated requests away from the protected app areas. This is an
// optimistic check only (cookie-based, no per-route DB roundtrip) -- actual
// data access is still enforced by RLS at the database, and admin-only pages
// must additionally check is_admin() server-side rather than relying on this
// redirect alone (see node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Optimistic checks with Proxy").
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = ["/questions", "/results", "/account", "/admin"];

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;

  // NOTE: this used to forward the pathname as an `x-pathname` request
  // header so app/layout.jsx could branch on it and skip the public
  // SiteHeader/SiteFooter for /admin. That was wrong, and the reason is
  // worth keeping: Proxy does run on every navigation, but the ROOT LAYOUT
  // does not re-render on client-side navigation, so it kept whatever it
  // decided on first paint. Navigating from a student page into /admin left
  // two headers stacked; direct-loading /admin and navigating back out left
  // a student page with none. The decision now lives in
  // components/layout/ChromeGate.jsx, a client component reading
  // usePathname(), which does update per navigation. Do not reintroduce the
  // header for this purpose.

  const { response, user } = await updateSession(request);

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets and image optimization so proxy doesn't run on
    // every CSS/JS/font/image request -- it only needs to see navigations.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
