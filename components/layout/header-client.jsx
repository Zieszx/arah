'use client';

// The interactive half of the site header. The Server Component wrapper
// (SiteHeader.jsx) decides `signedIn` from the session and hands over the
// logout Server Action; everything that needs the browser lives here:
//
//  - transparent over the particle field, gaining a subtle --surface
//    backdrop blur once scrolled (scroll listener);
//  - below 768px the nav collapses into an animated hamburger ↔ close
//    toggle (the 21st.dev menu-toggle-icon pattern) opening a drawer;
//  - the drawer traps focus while open, closes on Esc, and returns focus
//    to the toggle on close — a drawer you can tab out of behind the
//    overlay is a genuinely disorienting bug, so the trap includes the
//    toggle itself (it stays visible above the overlay as the close
//    affordance) and pulls any stray focus back inside.
//
// All hooks run unconditionally on every render — nothing here returns
// early before the hook list is complete (the project's hook-order rule).
// Motion is CSS-only (transitions + tw-animate-css entrance), which the
// global prefers-reduced-motion rule in app/globals.css collapses to
// ~0ms, so no useMotionCapability gating is needed at all.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const NAV_LINKS = [
  { href: '/questions', label: en.chrome.nav.questions },
  { href: '/explore', label: en.chrome.nav.explore },
  { href: '/account', label: en.chrome.nav.account },
];

// Shared interactive-state recipe: hover, focus-visible and active are all
// distinct, and there is deliberately no `outline-none` anywhere in this
// file — Tailwind v4's outline-none sets --tw-outline-style: none
// unconditionally and would silently kill the focus-visible ring (the
// FlowButton comment documents the mechanism; it bit this project before).
// The base recipe. Active state is layered on top by navLink() below rather
// than baked in here, because the drawer reuses the same idea at a much
// larger type size.
const navLinkClass = cn(
  'relative inline-flex min-h-11 items-center text-sm text-muted-foreground',
  'transition-colors duration-200 hover:text-text active:text-violet-lt',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
);

/**
 * The underline under a nav item. A real child rather than an ::after, because
 * it now has to react to THREE states, and a pseudo-element cannot read the
 * link's pending status:
 *
 *   active   the page you are on
 *   pending  clicked, navigation in flight
 *   neither  hidden
 *
 * The pending state is the point. Navigation here costs a server round trip
 * (prefetch is off — see the prefetch={false} comment below), and measured
 * against production the first visual change took 579ms on /explore and never
 * came at all on routes that had no loading.jsx. Half a second of a menu
 * looking untouched is exactly how someone ends up clicking it four times.
 *
 * useLinkStatus must be called from a component INSIDE the Link — it reads the
 * nearest Link ancestor, so a flag passed down from the component rendering
 * the Link would not work.
 */
function NavUnderline({ active }) {
  const { pending } = useLinkStatus();
  const shown = active || pending;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute inset-x-0 bottom-2.5 h-px origin-left bg-violet-pl',
        'transition-transform duration-200',
        shown ? 'scale-x-100' : 'scale-x-0',
        // A pending underline pulses so it reads as "working", not "arrived".
        pending && !active && 'animate-pulse'
      )}
    />
  );
}

// Marks the current section. `/explore/engineering` keeps `/explore` lit —
// a detail page is still "in" that section, and going dark there reads as a
// navigation bug. No entry is `/`, so prefix matching is safe for all of
// them; a `/` entry would need an exact check instead.
// usePathname() is typed `string | null` and really does hand back null
// outside a mounted App Router tree, so this must not assume a string —
// nothing is "current" when we don't know where we are.
function isActive(pathname, href) {
  if (typeof pathname !== 'string') return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLink(active) {
  return cn(navLinkClass, active && 'text-text');
}

/**
 * The drawer's leading rule. Same job as NavUnderline: it marks the current
 * item, and it appears the instant a link is clicked so a tap is acknowledged
 * before the route has loaded. On a phone this matters more than on desktop —
 * there is no hover state to have given any prior feedback.
 */
function DrawerRule({ active }) {
  const { pending } = useLinkStatus();
  const shown = active || pending;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-px w-6 transition-colors duration-200',
        shown ? 'bg-violet-pl' : 'bg-transparent',
        pending && !active && 'animate-pulse'
      )}
    />
  );
}

const authPillClass = cn(
  'inline-flex min-h-11 items-center rounded-full border border-hairline px-5',
  'text-sm text-text transition-colors duration-200',
  'hover:border-violet-lt/50 hover:text-violet-lt active:text-violet-pl',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
);

export default function HeaderChrome({ signedIn, logoutAction }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const drawerRef = useRef(null);
  // Distinguishes "closed by user action" (return focus to the toggle)
  // from "closed because the viewport grew past 768px" (leave focus be).
  const returnFocusRef = useRef(false);

  // Backdrop: transparent at the top of the page, --surface blur once
  // scrolled. Passive listener; also runs once on mount so a reload
  // mid-page starts in the correct state.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Drawer lifecycle: focus trap + Esc + scroll lock, active only while
  // open. Cleanup restores everything, and focus returns to the toggle
  // when the close was user-initiated.
  useEffect(() => {
    if (!open) return undefined;

    // Snapshot the toggle node: the cleanup below must return focus to the
    // SAME element that was live while the drawer was open, and lint
    // rightly warns that reading toggleRef.current inside cleanup could
    // see a later value.
    const toggleNode = toggleRef.current;

    // Move focus into the drawer once it exists in the DOM.
    const first = drawerRef.current?.querySelector('a[href], button');
    first?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function focusables() {
      // The toggle stays visible above the overlay as the close control,
      // so it belongs to the trap cycle: toggle → links → toggle.
      const inDrawer = drawerRef.current
        ? Array.from(
            drawerRef.current.querySelectorAll('a[href], button:not([disabled])')
          )
        : [];
      return [toggleNode, ...inDrawer].filter(Boolean);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        returnFocusRef.current = true;
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!nodes.includes(active)) {
        // Focus escaped (or never entered) — pull it back inside.
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
  }, [open]);

  // If the viewport grows past the breakpoint while the drawer is open
  // (rotation, window resize), close it rather than leaving an invisible
  // scroll lock and focus trap running behind the desktop nav.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (query.matches) setOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  function closeDrawer() {
    returnFocusRef.current = true;
    setOpen(false);
  }

  // A link tap both navigates and closes; focus goes with the navigation,
  // so no explicit return-to-toggle is wanted here.
  function closeForNavigation() {
    returnFocusRef.current = false;
    setOpen(false);
  }

  const authAction = signedIn ? (
    <form action={logoutAction} className="contents">
      <button type="submit" className={authPillClass}>
        {en.chrome.logout}
      </button>
    </form>
  ) : (
    <Link prefetch={false} href="/login" className={authPillClass}>
      {en.chrome.login}
    </Link>
  );

  return (
    // The blur backdrop lives on the inner bar div, NOT on <header>
    // itself: backdrop-filter on an ancestor makes it the containing
    // block for position:fixed descendants, which would pin the mobile
    // drawer to the 64px header box instead of the viewport and let the
    // page show through beneath it. Caught by screenshot at 390px.
    <header className="sticky top-0 z-50">
      <div
        className={cn(
          'border-b transition-colors duration-300',
          // 92% + a stronger blur, not 75%. On the dark theme a light scrim
          // over dark content hid it easily; on paper the header and the
          // cards beneath are both near-white, so it is the *dark text* that
          // shows through. At 75% the card copy was legibly ghosting behind
          // the nav — caught on /explore in production. Anything below ~90%
          // reads as a rendering fault rather than frosted glass.
          scrolled || open
            ? 'border-hairline bg-paper/92 backdrop-blur-lg'
            : 'border-transparent bg-transparent'
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-6 px-6 md:px-16">
          <Link prefetch={false}
            href="/"
            className="font-display inline-flex min-h-11 w-fit items-center text-lg uppercase text-text/90 transition-colors duration-200 hover:text-text active:text-violet-lt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt md:text-xl"
            style={{ letterSpacing: '0.20em' }}
          >
            ARAH
          </Link>

          {/* Desktop nav — hidden below 768px. */}
          <nav aria-label="Site" className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  // See FieldCard.jsx for why this is off. Measured: the
                  // default segment prefetch 404s for every public route.
                  prefetch={false}
                  aria-current={active ? 'page' : undefined}
                  className={navLink(active)}
                >
                  {label}
                  <NavUnderline active={active} />
                </Link>
              );
            })}
            {authAction}
          </nav>

          {/* Mobile toggle — the 21st.dev menu-toggle-icon pattern: two
              hairlines that slide together and rotate into a close cross.
              Motion is pure CSS transition, so the global reduced-motion
              rule collapses it to an instant swap. */}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? en.chrome.menuClose : en.chrome.menuOpen}
            onClick={() => (open ? closeDrawer() : setOpen(true))}
            className={cn(
              'relative flex size-11 items-center justify-center rounded-full md:hidden',
              'text-text transition-colors duration-200 hover:text-violet-lt active:text-violet-pl',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
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
        </div>
      </div>

      {/* Mobile drawer — conditionally rendered, so when closed it is
          absent from the DOM (nothing to tab into, nothing announced).
          Sits below the 64px header bar; the toggle above stays visible
          and doubles as the close control. */}
      {open ? (
        <div
          ref={drawerRef}
          id="site-menu"
          role="dialog"
          aria-label={en.chrome.menuLabel}
          className={cn(
            'fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col overflow-y-auto',
            // bg-surface/95, not bg-ink/95: --ink is body text on the light
            // theme, not a background — the drawer needs to stay on the
            // light "paper/surface" system like the rest of the page, at
            // near-opacity so content scrolling underneath doesn't show
            // through the open menu.
            'bg-surface/95 px-6 pb-10 pt-8 backdrop-blur-md md:hidden',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          <nav aria-label="Site" className="flex flex-col gap-2">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link prefetch={false}
                  key={href}
                  href={href}
                  onClick={closeForNavigation}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'font-display inline-flex min-h-12 w-fit items-center gap-3 text-3xl',
                    'transition-colors duration-200 hover:text-violet-lt active:text-violet-pl',
                    'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-lt',
                    active ? 'text-violet-pl' : 'text-text'
                  )}
                >
                  {/* A colour swap alone is a weak signal at this size on a
                      near-white panel, so the current item also carries a
                      rule — two cues, neither of which is colour on its own.
                      The same rule doubles as the pending indicator. */}
                  <DrawerRule active={active} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-10 border-t border-hairline pt-8">
            {signedIn ? (
              <form action={logoutAction} className="contents">
                <button type="submit" className={authPillClass}>
                  {en.chrome.logout}
                </button>
              </form>
            ) : (
              <Link prefetch={false} href="/login" onClick={closeForNavigation} className={authPillClass}>
                {en.chrome.login}
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
