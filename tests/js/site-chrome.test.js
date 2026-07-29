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
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) =>
    React.createElement('a', { href, ...props }, children),
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
