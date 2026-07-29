// Site header — Server Component wrapper. Reads the session once (shared
// with SiteFooter through the cached getViewer) and hands the interactive
// chrome a plain boolean plus the logout Server Action. The session read
// happens per-request on the server; client-side navigations don't re-run
// the layout (see node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Layouts and auth checks"), which is fine here because the only way the
// signed-in state changes is through the login/signup/logout Server
// Actions, and completing a Server Action refreshes the whole router tree.
//
// This is chrome, not a guard: nothing about page access is decided here.
// proxy.js redirects unauthenticated navigation and each protected page
// re-checks its own session server-side.
import { getViewer } from '@/lib/supabase/viewer';
import { logout } from '@/app/(auth)/actions';
import HeaderChrome from './header-client.jsx';

export default async function SiteHeader() {
  const { user } = await getViewer();
  return <HeaderChrome signedIn={Boolean(user)} logoutAction={logout} />;
}
