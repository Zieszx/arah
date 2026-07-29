'use client';

// The admin top bar (Task 1): breadcrumb, the signed-in admin's name, a
// link back to the student site, sign out — plus the hamburger toggle for
// AdminSidebar's off-canvas drawer below 1280px (the button lives here,
// in the header row, but AdminSidebar owns the drawer/focus-trap; both
// are handed the same `toggleRef`/`open` state by AdminShell, their
// shared parent, exactly like this button needs to be part of the
// drawer's own focus cycle to return focus correctly on close).
//
// All hooks (just usePathname here) run unconditionally, before any
// conditional rendering — the project's hook-order rule.
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';
import { activeNavItem } from './nav-items';

// Same interactive-state recipe used across the site (SiteHeader,
// SiteFooter, FlowButton): hover / focus-visible / active all distinct,
// and no bare `outline-none` anywhere — Tailwind v4's outline-none sets
// --tw-outline-style: none unconditionally and would silently kill the
// focus-visible ring.
const pillClass = cn(
  'inline-flex min-h-10 items-center rounded-full border border-hairline px-4',
  'text-sm text-ink transition-colors duration-200',
  'hover:border-violet/40 hover:text-violet-ink active:text-violet-pl',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
);

export default function AdminHeader({ profile, open, onToggle, toggleRef, signOutAction }) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const name = profile?.display_name || profile?.email || 'Admin';

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-surface/95 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="admin-menu"
          aria-label={open ? en.admin.menuClose : en.admin.menuOpen}
          onClick={onToggle}
          className={cn(
            'relative flex size-10 shrink-0 items-center justify-center rounded-full xl:hidden',
            'text-ink transition-colors duration-200 hover:text-violet-ink active:text-violet-pl',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'absolute h-px w-5 bg-current transition-transform duration-300 ease-out',
              open ? 'translate-y-0 rotate-45' : '-translate-y-[3.5px] rotate-0'
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute h-px w-5 bg-current transition-transform duration-300 ease-out',
              open ? 'translate-y-0 -rotate-45' : 'translate-y-[3.5px] rotate-0'
            )}
          />
        </button>

        {/* Breadcrumb — "Admin" is a Link back to Overview; the active
            segment (when it isn't Overview itself) is plain text, not a
            link to itself. */}
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-2 text-sm">
            <li className="shrink-0">
              <Link
                href="/admin"
                className="text-muted-foreground transition-colors duration-200 hover:text-violet-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
              >
                {en.admin.breadcrumbRoot}
              </Link>
            </li>
            {active && active.href !== '/admin' ? (
              <>
                <li aria-hidden="true" className="shrink-0 text-hairline">
                  /
                </li>
                <li className="truncate font-medium text-ink">{active.label}</li>
              </>
            ) : null}
          </ol>
        </nav>

        {/* Below 768px there isn't room for the name + two pills next to
            the breadcrumb without crowding or overlapping it (caught by
            screenshot at 320/390 — the fix is here, not a smaller font:
            these controls move into AdminSidebar's drawer instead, right
            below the nav links, same place SiteHeader's mobile drawer
            already puts its own sign-out control). */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <span className="text-sm text-muted-foreground">
            {en.admin.signedInAs}{' '}
            <span className="font-medium text-ink">{name}</span>
          </span>
          <Link href="/" className={pillClass}>
            {en.admin.backToSite}
          </Link>
          <form action={signOutAction} className="contents">
            <button type="submit" className={pillClass}>
              {en.admin.signOut}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
