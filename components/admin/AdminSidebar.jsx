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
import { ADMIN_NAV_GROUPS, isNavItemActive } from './nav-items';

// Rounded rows inset from the panel edge, not full-bleed rows with a
// border-left tab. The tab treatment read as a browser chrome artefact once
// the duplicated site header was removed and the sidebar became the only
// vertical element on the page.
const linkBaseClass = cn(
  'group/nav flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14.5px] leading-tight',
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

// The wordmark plus a subtitle naming the section. Without the subtitle the
// sidebar just repeated "ARAH" at the same size and weight as the site
// header's own wordmark, which read as the logo having been rendered twice
// rather than as the admin console having a name.
function BrandBlock({ compact = false }) {
  return (
    <div
      className={cn(
        'flex flex-col justify-center border-b border-hairline px-5',
        compact ? 'pb-4 pt-1' : 'h-[72px]'
      )}
    >
      <span
        className="font-display text-[17px] uppercase leading-none text-ink"
        style={{ letterSpacing: '0.20em' }}
      >
        ARAH
      </span>
      <span className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-violet">
        {en.admin.nav.sectionLabel}
      </span>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }) {
  return (
    <div className="flex flex-col gap-5">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            {group.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
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
                        ? 'bg-violet-soft/70 font-medium text-violet-ink'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-ink active:text-violet-ink'
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className={cn(
                        'size-[17px] shrink-0 transition-colors duration-200',
                        active
                          ? 'text-violet'
                          : 'text-muted-foreground/70 group-hover/nav:text-ink'
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
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
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-hairline bg-surface xl:flex"
      >
        <BrandBlock />
        <nav aria-label={en.admin.menuLabel} className="flex-1 px-3 py-4">
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
            <BrandBlock compact />
            <nav aria-label={en.admin.menuLabel} className="mt-4 flex-1 px-1">
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
