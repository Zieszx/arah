// The admin shell (Plan 5, Task 1). Wraps every route under app/(admin)/
// — today just /admin (Task 2's Overview) — in requireAdmin()'s gate plus
// AdminShell's sidebar/header chrome.
//
// requireAdmin() runs here so the shell has the profile it needs for
// AdminHeader (display name) without a second query, AND in every child
// page.jsx itself (see lib/auth/requireAdmin.js's header comment for why
// the layout alone is not enough — layouts don't re-render on
// client-side navigation between the sibling routes they wrap, per
// node_modules/next/dist/docs/01-app/02-guides/authentication.md,
// "Layouts and auth checks"). Both calls land in the same request's
// React `cache()` bucket, so this costs one DB read per request, not two.
//
// This route group is nested INSIDE the existing app/layout.jsx (route
// groups add wrapping, they don't replace an ancestor root layout — see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md).
// app/layout.jsx conditionally skips rendering the public SiteHeader/
// SiteFooter for any /admin route (detected via the `x-pathname` header
// proxy.js now forwards) so this shell is the ONLY chrome an admin page
// shows — no duplicated nav, no duplicated sign-out.
import { logout } from '@/app/(auth)/actions';
import requireAdmin from '@/lib/auth/requireAdmin';
import AdminShell from '@/components/admin/AdminShell.jsx';

export default async function AdminLayout({ children }) {
  const profile = await requireAdmin();

  return (
    <AdminShell profile={profile} signOutAction={logout}>
      {children}
    </AdminShell>
  );
}
