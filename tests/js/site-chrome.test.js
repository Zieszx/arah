// @vitest-environment jsdom
//
// Unit tests for the Task 7 global chrome:
//  - the admin-entry decision matrix (a security requirement — the
//    signed-in non-admin case must yield null, i.e. NOTHING rendered;
//    the end-to-end served-HTML proof lives in admin-absence.test.js);
//  - the mobile drawer's keyboard contract: focus trap while open,
//    Esc closes, focus returns to the toggle on close.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// next/link renders through Next's router context, which doesn't exist in
// a bare jsdom test — substitute a plain anchor with identical props.
// The header now also imports useLinkStatus, so the mock has to provide it or
// every render throws. `pending` is driven from here so the pending-state
// tests can flip it without a real navigation.
const linkStatus = { pending: false };
vi.mock('next/link', () => ({
  default: ({ href, children, prefetch, ...props }) =>
    // `prefetch` is swallowed rather than spread: React warns about an unknown
    // boolean attribute on a DOM element, and the warning is noise here.
    React.createElement('a', { href, ...props }, children),
  useLinkStatus: () => linkStatus,
}));

// The header marks the current section from usePathname(). Outside a real
// App Router tree that returns null, so the tests drive it explicitly —
// including the null case, which must simply light nothing.
const pathnameRef = { current: '/' };
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

// jsdom has no matchMedia; the header uses it to auto-close the drawer
// when the viewport grows past 768px.
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
});

const { adminEntryHref } = await import('@/components/layout/admin-entry.js');
const { default: HeaderChrome } = await import(
  '@/components/layout/header-client.jsx'
);

describe('adminEntryHref — the footer admin security matrix', () => {
  it('signed out → links to /login?next=/admin', () => {
    expect(adminEntryHref({ signedIn: false, isAdmin: false })).toBe(
      '/login?next=/admin'
    );
  });

  it('signed in admin → links to /admin', () => {
    expect(adminEntryHref({ signedIn: true, isAdmin: true })).toBe('/admin');
  });

  it('signed in ordinary student → null, so the node is never rendered', () => {
    expect(adminEntryHref({ signedIn: true, isAdmin: false })).toBeNull();
  });

  it('isAdmin can never leak through for a signed-out viewer', () => {
    // Even if a bug upstream claimed isAdmin for an anonymous request, the
    // entry must still route through the login gate.
    expect(adminEntryHref({ signedIn: false, isAdmin: true })).toBe(
      '/login?next=/admin'
    );
  });
});

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

function pressKey(key, options = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...options })
    );
  });
}

function renderHeader() {
  return mount(
    React.createElement(HeaderChrome, {
      signedIn: false,
      logoutAction: () => {},
    })
  );
}

function openDrawer(container) {
  const toggle = container.querySelector('button[aria-controls="site-menu"]');
  act(() => {
    toggle.click();
  });
  return toggle;
}

// Reads the desktop nav's current-page marker. aria-current is the contract
// the styling hangs off, so asserting on it covers both at once.
function currentHrefs(container) {
  return Array.from(container.querySelectorAll('a[aria-current="page"]')).map(
    (a) => a.getAttribute('href')
  );
}

describe('HeaderChrome active navigation state', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    pathnameRef.current = '/';
  });

  it('marks nothing on the landing page — no nav entry points at /', () => {
    pathnameRef.current = '/';
    const { container, root } = renderHeader();
    expect(currentHrefs(container)).toEqual([]);
    root.unmount();
  });

  it('marks exactly the section being viewed, and only that one', () => {
    pathnameRef.current = '/explore';
    const { container, root } = renderHeader();
    expect(currentHrefs(container)).toEqual(['/explore']);
    root.unmount();
  });

  it('keeps the section lit on a detail page beneath it', () => {
    // A field page is still "in" Explore; going dark here reads as a bug.
    pathnameRef.current = '/explore/engineering';
    const { container, root } = renderHeader();
    expect(currentHrefs(container)).toEqual(['/explore']);
    root.unmount();
  });

  it('does not treat a shared prefix as the same section', () => {
    // /questions must not light up for a sibling like /questions-archive.
    pathnameRef.current = '/questions-archive';
    const { container, root } = renderHeader();
    expect(currentHrefs(container)).toEqual([]);
    root.unmount();
  });

  it('marks nothing when the pathname is unknown (null)', () => {
    pathnameRef.current = null;
    const { container, root } = renderHeader();
    expect(currentHrefs(container)).toEqual([]);
    root.unmount();
  });

  it('marks the matching entry inside the mobile drawer too', () => {
    pathnameRef.current = '/explore';
    const { container, root } = renderHeader();
    openDrawer(container);
    const drawerCurrent = Array.from(
      document.getElementById('site-menu').querySelectorAll('a[aria-current="page"]')
    ).map((a) => a.getAttribute('href'));
    expect(drawerCurrent).toEqual(['/explore']);
    root.unmount();
  });
});

describe('HeaderChrome mobile drawer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('is absent from the DOM until opened, present after', () => {
    const { container, root } = renderHeader();
    expect(document.getElementById('site-menu')).toBeNull();
    const toggle = openDrawer(container);
    expect(document.getElementById('site-menu')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    root.unmount();
  });

  it('moves focus into the drawer on open', () => {
    const { container, root } = renderHeader();
    openDrawer(container);
    const drawer = document.getElementById('site-menu');
    const first = drawer.querySelector('a[href], button');
    expect(document.activeElement).toBe(first);
    root.unmount();
  });

  it('traps Tab: cycles from the last drawer item back to the toggle', () => {
    const { container, root } = renderHeader();
    const toggle = openDrawer(container);
    const drawer = document.getElementById('site-menu');
    const focusables = drawer.querySelectorAll('a[href], button');
    const last = focusables[focusables.length - 1];
    act(() => {
      last.focus();
    });
    pressKey('Tab');
    // First node of the trap cycle is the toggle itself (it stays visible
    // above the overlay as the close control).
    expect(document.activeElement).toBe(toggle);
    root.unmount();
  });

  it('traps Shift+Tab: cycles from the toggle to the last drawer item', () => {
    const { container, root } = renderHeader();
    const toggle = openDrawer(container);
    act(() => {
      toggle.focus();
    });
    pressKey('Tab', { shiftKey: true });
    const drawer = document.getElementById('site-menu');
    const focusables = drawer.querySelectorAll('a[href], button');
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
    root.unmount();
  });

  it('pulls stray focus back inside the trap', () => {
    const { container, root } = renderHeader();
    openDrawer(container);
    // Simulate focus escaping behind the overlay to page content outside
    // the trap (the exact bug the trap exists to prevent).
    const outside = document.createElement('button');
    outside.textContent = 'behind the overlay';
    document.body.appendChild(outside);
    act(() => {
      outside.focus();
    });
    expect(document.activeElement).toBe(outside);
    pressKey('Tab');
    expect(document.activeElement).toBe(
      container.querySelector('button[aria-controls="site-menu"]')
    );
    root.unmount();
  });

  it('closes on Esc and returns focus to the toggle', () => {
    const { container, root } = renderHeader();
    const toggle = openDrawer(container);
    expect(document.getElementById('site-menu')).not.toBeNull();
    pressKey('Escape');
    expect(document.getElementById('site-menu')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    root.unmount();
  });

  it('locks body scroll while open and restores it on close', () => {
    const { container, root } = renderHeader();
    openDrawer(container);
    expect(document.body.style.overflow).toBe('hidden');
    pressKey('Escape');
    expect(document.body.style.overflow).toBe('');
    root.unmount();
  });

  it('never uses outline-none anywhere in the chrome (Tailwind v4 focus-ring killer)', () => {
    const { container, root } = renderHeader();
    openDrawer(container);
    const all = [container, document.getElementById('site-menu')]
      .filter(Boolean)
      .flatMap((node) => Array.from(node.querySelectorAll('*')));
    for (const el of all) {
      expect(String(el.className)).not.toMatch(/(?:^|\s)outline-none(?:\s|$)/);
    }
    root.unmount();
  });
});

// The pending indicator. This exists because measured against production a
// menu click produced no visual change for 579ms on /explore, and none at all
// on routes that had no loading.jsx — half a second of a menu looking
// untouched is how someone ends up clicking it four times.
//
// useLinkStatus fires on click, before the route has loaded, so the marker
// appears immediately. `linkStatus.pending` is the mock at the top of this
// file, standing in for a navigation in flight.
describe('HeaderChrome pending navigation feedback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    pathnameRef.current = '/';
    linkStatus.pending = false;
  });

  /**
   * Desktop underlines that are actually VISIBLE.
   *
   * Matching on `bg-violet-pl` would count all four: the colour is always on
   * the element and only the transform toggles. Visibility is scale-x-100 —
   * the underline is laid out at full width even when hidden so switching
   * pages never reflows the nav row.
   */
  function shownMarkers(scope) {
    return Array.from(scope.querySelectorAll('span[aria-hidden="true"]')).filter(
      (el) => el.className.includes('scale-x-100')
    ).length;
  }

  it('shows no marker when nothing is active and nothing is pending', () => {
    const { container, root } = renderHeader();
    const nav = container.querySelector('nav[aria-label="Site"]');
    expect(shownMarkers(nav)).toBe(0);
    root.unmount();
  });

  it('shows a marker on every nav item while a navigation is in flight', () => {
    // The mock is global, so all links read pending — enough to prove the
    // indicator is driven by link status rather than by the active route.
    linkStatus.pending = true;
    const { container, root } = renderHeader();
    const nav = container.querySelector('nav[aria-label="Site"]');
    expect(shownMarkers(nav)).toBeGreaterThan(0);
    root.unmount();
  });

  it('marks the active item even when nothing is pending', () => {
    pathnameRef.current = '/explore';
    const { container, root } = renderHeader();
    const nav = container.querySelector('nav[aria-label="Site"]');
    expect(shownMarkers(nav)).toBe(1);
    root.unmount();
  });

  it('does not pulse the active item — it has arrived, not pending', () => {
    pathnameRef.current = '/explore';
    const { container, root } = renderHeader();
    const active = container.querySelector('a[aria-current="page"]');
    const marker = active.querySelector('span[aria-hidden="true"]');
    expect(marker.className).not.toContain('animate-pulse');
    root.unmount();
  });

  it('keeps the marker decorative — never announced', () => {
    // A screen reader gets the route-level loading announcement; a second
    // live region on every nav item would talk over it.
    linkStatus.pending = true;
    const { container, root } = renderHeader();
    const nav = container.querySelector('nav[aria-label="Site"]');
    for (const span of nav.querySelectorAll('span')) {
      if (span.className.includes('bg-violet-pl')) {
        expect(span.getAttribute('aria-hidden')).toBe('true');
      }
    }
    root.unmount();
  });
});
