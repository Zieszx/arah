// Single source of truth for the admin sidebar's nav — shared by
// AdminSidebar (renders the list) and AdminHeader (derives the
// breadcrumb from whichever item matches the current path), so the two
// can never drift out of sync on labels or hrefs.
//
// Only /admin (Overview, this plan's Task 2) exists today. The other four
// routes are the rest of Plan 5 — linking to them now, ahead of their own
// pages landing, is deliberate: the nav is meant to read as the whole
// admin section from day one, not grow a link at a time. Visiting one
// before its task ships is an ordinary 404, same as any other
// not-yet-built route in this codebase.
import en from '@/lib/i18n/en';

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: en.admin.nav.overview },
  { href: '/admin/survey-data', label: en.admin.nav.surveyData },
  { href: '/admin/responses', label: en.admin.nav.studentResponses },
  { href: '/admin/contributions', label: en.admin.nav.contributions },
  { href: '/admin/algorithm-tester', label: en.admin.nav.algorithmTester },
];

/**
 * Is `pathname` this nav item's route? `/admin` only matches exactly
 * (every other admin route also starts with `/admin`, so a prefix match
 * would light up Overview everywhere); every other item matches itself
 * or any of its own sub-routes.
 */
export function isNavItemActive(pathname, href) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav item whose route contains `pathname`, for the header breadcrumb. */
export function activeNavItem(pathname) {
  return ADMIN_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href)) ?? null;
}
