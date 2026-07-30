// Single source of truth for the admin nav — shared by AdminSidebar (renders
// the groups) and AdminHeader (derives the breadcrumb from whichever item
// matches the current path), so the two can never drift on labels or hrefs.
//
// ADMIN_NAV_GROUPS is the structure the sidebar renders. ADMIN_NAV_ITEMS is
// the flat list derived from it, and remains the contract everything else
// (breadcrumb, tests) reads — adding a group must never mean remembering to
// update a second hand-maintained list.
import {
  LayoutDashboard,
  ChartPie,
  Table2,
  ClipboardList,
  Inbox,
  Users,
  FlaskConical,
} from 'lucide-react';
import en from '@/lib/i18n/en';

export const ADMIN_NAV_GROUPS = [
  {
    label: en.admin.nav.groupDashboard,
    items: [
      { href: '/admin', label: en.admin.nav.overview, icon: LayoutDashboard },
      {
        href: '/admin/response-charts',
        label: en.admin.nav.responseCharts,
        icon: ChartPie,
      },
    ],
  },
  {
    label: en.admin.nav.groupData,
    items: [
      { href: '/admin/survey-data', label: en.admin.nav.surveyData, icon: Table2 },
      {
        href: '/admin/responses',
        label: en.admin.nav.studentResponses,
        icon: ClipboardList,
      },
      { href: '/admin/contributions', label: en.admin.nav.contributions, icon: Inbox },
      { href: '/admin/users', label: en.admin.nav.users, icon: Users },
    ],
  },
  {
    label: en.admin.nav.groupModel,
    items: [
      {
        href: '/admin/algorithm-tester',
        label: en.admin.nav.algorithmTester,
        icon: FlaskConical,
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

/**
 * Is `pathname` this nav item's route? `/admin` only matches exactly
 * (every other admin route also starts with `/admin`, so a prefix match
 * would light up Overview everywhere); every other item matches itself
 * or any of its own sub-routes.
 */
export function isNavItemActive(pathname, href) {
  if (typeof pathname !== 'string') return false;
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The nav item whose route contains `pathname`, for the header breadcrumb. */
export function activeNavItem(pathname) {
  return ADMIN_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href)) ?? null;
}
