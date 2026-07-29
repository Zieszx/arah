'use client';

// The persistent admin nav (Task 1). Two renderings of the same list,
// controlled by breakpoint alone:
//
//  - >=1280px (`xl:`): pinned open at 240px, always in the DOM, never
//    interactive as an overlay — it's just a column.
//  - <1280px: off-canvas drawer, opened by the hamburger toggle that
//    lives in AdminHeader (`toggleRef` is passed in from AdminShell,
//    the shared parent, so this component can include that button in
//    its own focus-trap cycle and return focus to it on close — same
//    reasoning as components/layout/header-client.jsx's mobile drawer,
//    whose trap/Esc/return-focus implementation this one mirrors).
//
// All hooks run unconditionally on every render, before any conditional
// return — the project's hook-order rule (this component has no early
// return at all, but the effects below are written so adding one later
// can't accidentally skip a hook call).
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';
import { ADMIN_NAV_ITEMS, isNavItemActive } from './nav-items';

const linkBaseClass = cn(
  'flex min-h-11 items-center border-l-2 px-5 text-[15px] leading-tight',
  'transition-colors duration-200',
  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet'
);

// The drawer's mobile-only footer (name / back-to-site / sign-out) —
// plain rows, not pills, since AdminHeader's pill treatment was sized for
// a horizontal row with room to spare, not a narrow vertical stack.
const mobileFooterLinkClass = cn(
  'mt-1 flex min-h-11 w-full items-center text-left text-[15px] text-ink',
  'transition-colors duration-200 hover:text-violet-ink active:text-violet-pl',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
);

function NavLinks({ pathname, onNavigate }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {ADMIN_NAV_ITEMS.map(({ href, label }) => {
        const active = isNavItemActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                linkBaseClass,
                active
                  ? 'border-violet bg-violet-soft/60 font-medium text-violet-ink'
                  : 'border-transparent text-muted-foreground hover:border-hairline hover:bg-surface-2 hover:text-ink active:text-violet-ink'
              )}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminSidebar({ open, onClose, toggleRef, profile, signOutAction }) {
  const pathname = usePathname();
  const name = profile?.display_name || profile?.email || null;
  const drawerRef = useRef(null);
  const returnFocusRef = useRef(false);

  // Drawer lifecycle: focus trap + Esc + scroll lock, mirroring
  // components/layout/header-client.jsx's mobile drawer exactly (that
  // implementation is the one this project already ships and tests —
  // tests/js/site-chrome.test.js — so this repeats its shape rather than
  // inventing a second pattern).
  useEffect(() => {
    if (!open) return undefined;

    const toggleNode = toggleRef?.current ?? null;

    const first = drawerRef.current?.querySelector('a[href], button');
    first?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function focusables() {
      const inDrawer = drawerRef.current
        ? Array.from(
            drawerRef.current.querySelectorAll('a[href], button:not([disabled])')
          )
        : [];
      // The toggle stays visible above the overlay as the close control
      // (rendered by AdminHeader), so it belongs in the trap cycle too:
      // toggle -> drawer links -> toggle.
      return [toggleNode, ...inDrawer].filter(Boolean);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        returnFocusRef.current = true;
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!nodes.includes(active)) {
        event.preventDefault();
        firstNode.focus();
      } else if (!event.shiftKey && active === lastNode) {
        event.preventDefault();
        firstNode.focus();
      } else if (event.shiftKey && active === firstNode) {
        event.preventDefault();
        lastNode.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocusRef.current) {
        returnFocusRef.current = false;
        toggleNode?.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If the viewport grows to the pinned breakpoint while the drawer is
  // open, close it rather than leaving an invisible scroll lock and
  // focus trap running behind the now-pinned sidebar.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1280px)');
    const onChange = () => {
      if (query.matches) onClose();
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeForClick() {
    returnFocusRef.current = true;
    onClose();
  }

  function closeForNavigation() {
    returnFocusRef.current = false;
    onClose();
  }

  return (
    <>
      {/* Pinned column, >=1280px. Always mounted; CSS-hidden below the
          breakpoint, so it never enters the tab order there. */}
      <aside
        aria-label={en.admin.menuLabel}
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-y-auto border-r border-hairline bg-surface xl:flex"
      >
        <div className="flex h-16 items-center px-6">
          <span
            className="font-display text-lg uppercase text-ink/90"
            style={{ letterSpacing: '0.20em' }}
          >
            ARAH
          </span>
        </div>
        <nav aria-label={en.admin.menuLabel} className="flex-1 px-2 py-2">
          <NavLinks pathname={pathname} onNavigate={undefined} />
        </nav>
      </aside>

      {/* Off-canvas drawer, <1280px. Conditionally rendered so it is
          entirely absent from the DOM (and the tab order) while closed. */}
      {open ? (
        <>
          <div
            aria-hidden="true"
            onClick={closeForClick}
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] xl:hidden"
          />
          <div
            ref={drawerRef}
            id="admin-menu"
            role="dialog"
            aria-modal="true"
            aria-label={en.admin.menuLabel}
            className={cn(
              'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto',
              'border-r border-hairline bg-surface px-2 pb-10 pt-6 shadow-xl xl:hidden',
              'animate-in fade-in slide-in-from-left-4 duration-200'
            )}
          >
            <div className="flex h-10 items-center px-4">
              <span
                className="font-display text-lg uppercase text-ink/90"
                style={{ letterSpacing: '0.20em' }}
              >
                ARAH
              </span>
            </div>
            <nav aria-label={en.admin.menuLabel} className="mt-4 flex-1">
              <NavLinks pathname={pathname} onNavigate={closeForNavigation} />
            </nav>
            {/* Below 768px, AdminHeader hides the name/back-link/sign-out
                pills — no room next to the breadcrumb without crowding it
                (caught by screenshot at 320/390). Below 768 they move
                here instead, same place SiteHeader's own mobile drawer
                puts its sign-out control. Hidden again at md: the header
                shows them there, so this avoids a redundant second set
                the one time the drawer could be opened at that width. */}
            <div className="mt-6 border-t border-hairline px-4 pt-6 md:hidden">
              {name ? (
                <p className="text-sm text-muted-foreground">
                  {en.admin.signedInAs} <span className="font-medium text-ink">{name}</span>
                </p>
              ) : null}
              <Link
                href="/"
                onClick={closeForNavigation}
                className={mobileFooterLinkClass}
              >
                {en.admin.backToSite}
              </Link>
              <form action={signOutAction} className="contents">
                <button type="submit" className={mobileFooterLinkClass}>
                  {en.admin.signOut}
                </button>
              </form>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
