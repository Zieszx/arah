'use client';

// Decides whether the public SiteHeader/SiteFooter render. /admin supplies
// its own chrome (components/admin/AdminShell.jsx — sidebar, breadcrumb, its
// own sign-out), so showing both duplicates the nav and the sign-out control.
//
// This HAS to be a client decision. The obvious server version — read the
// pathname off a request header in app/layout.jsx and branch there — is
// broken in a way that only shows up in a browser: a root layout does not
// re-render on client-side navigation, so whatever it decided on the first
// paint sticks for the rest of the session. Measured in production before
// this existed:
//
//   direct load  /admin/survey-data   -> 1 header   (correct)
//   client nav   / -> /admin          -> 2 headers, 3 ARAH logos
//
// and the mirror of it, direct-loading /admin and then navigating out to a
// student page, left that page with no header at all. usePathname() updates
// on every navigation, so both directions are correct here.
//
// Children are always rendered by the server and passed in; this only decides
// whether to mount them. That keeps SiteHeader a Server Component (it reads
// the session) while the gate stays client-side — composition, not a client
// import.
import { usePathname } from 'next/navigation';

/** Admin owns its chrome; every other route gets the public header/footer. */
export function isAdminRoute(pathname) {
  if (typeof pathname !== 'string') return false;
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export default function ChromeGate({ children }) {
  const pathname = usePathname();
  return isAdminRoute(pathname) ? null : children;
}
