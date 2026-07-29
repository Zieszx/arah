// @vitest-environment jsdom
//
// Component-level tests for the Task 1 admin shell:
//  - AdminSidebar's active-route marker (components/admin/nav-items.js);
//  - the off-canvas drawer's keyboard contract — focus trap, Esc, focus
//    returned to the toggle on close — which lives split across
//    AdminHeader (the toggle button) and AdminSidebar (the drawer), tied
//    together by AdminShell's shared `toggleRef`/`open` state. Mirrors
//    tests/js/site-chrome.test.js's drawer contract tests for the public
//    HeaderChrome, which this implementation is deliberately modelled on.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

let currentPathname = '/admin';
vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) =>
    React.createElement('a', { href, ...props }, children),
}));

window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
});

const { default: AdminShell } = await import('@/components/admin/AdminShell.jsx');
const { ADMIN_NAV_ITEMS, isNavItemActive, activeNavItem } = await import(
  '@/components/admin/nav-items.js'
);

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

function renderShell() {
  return mount(
    React.createElement(
      AdminShell,
      { profile: { display_name: 'Nuha', email: 'nuhaaa@arah.app' }, signOutAction: () => {} },
      React.createElement('p', null, 'page content')
    )
  );
}

function openDrawer(container) {
  const toggle = container.querySelector('button[aria-controls="admin-menu"]');
  act(() => {
    toggle.click();
  });
  return toggle;
}

describe('admin nav-items — active route matching', () => {
  it('Overview only matches the exact /admin path', () => {
    expect(isNavItemActive('/admin', '/admin')).toBe(true);
    expect(isNavItemActive('/admin/survey-data', '/admin')).toBe(false);
  });

  it('other items match themselves and their sub-routes', () => {
    expect(isNavItemActive('/admin/responses', '/admin/responses')).toBe(true);
    expect(isNavItemActive('/admin/responses/42', '/admin/responses')).toBe(true);
    expect(isNavItemActive('/admin/contributions', '/admin/responses')).toBe(false);
  });

  it('activeNavItem resolves the current item for the breadcrumb', () => {
    expect(activeNavItem('/admin')?.href).toBe('/admin');
    expect(activeNavItem('/admin/algorithm-tester')?.href).toBe('/admin/algorithm-tester');
    expect(activeNavItem('/admin/nowhere')).toBeNull();
  });

  it('every nav item has a non-empty label and a /admin-rooted href', () => {
    for (const item of ADMIN_NAV_ITEMS) {
      expect(item.href.startsWith('/admin')).toBe(true);
      expect(item.label.length).toBeGreaterThan(0);
    }
  });
});

describe('AdminSidebar — active route marker', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    currentPathname = '/admin/responses';
  });

  it('marks the current route with aria-current="page", and only that one', () => {
    const { root } = renderShell();
    const current = document.querySelectorAll('a[aria-current="page"]');
    // Rendered twice: once in the pinned >=1280px nav, once in the
    // (unmounted-while-closed) drawer markup that isn't in the DOM yet —
    // so exactly one match while the drawer is closed.
    expect(current.length).toBe(1);
    expect(current[0].getAttribute('href')).toBe('/admin/responses');
    root.unmount();
  });
});

describe('AdminShell mobile drawer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    currentPathname = '/admin';
  });

  it('is absent from the DOM until opened, present after', () => {
    const { container, root } = renderShell();
    expect(document.getElementById('admin-menu')).toBeNull();
    const toggle = openDrawer(container);
    expect(document.getElementById('admin-menu')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    root.unmount();
  });

  it('moves focus into the drawer on open', () => {
    const { container, root } = renderShell();
    openDrawer(container);
    const drawer = document.getElementById('admin-menu');
    const first = drawer.querySelector('a[href], button');
    expect(document.activeElement).toBe(first);
    root.unmount();
  });

  it('traps Tab: cycles from the last drawer item back to the toggle', () => {
    const { container, root } = renderShell();
    const toggle = openDrawer(container);
    const drawer = document.getElementById('admin-menu');
    const focusables = drawer.querySelectorAll('a[href], button');
    const last = focusables[focusables.length - 1];
    act(() => {
      last.focus();
    });
    pressKey('Tab');
    expect(document.activeElement).toBe(toggle);
    root.unmount();
  });

  it('traps Shift+Tab: cycles from the toggle to the last drawer item', () => {
    const { container, root } = renderShell();
    const toggle = openDrawer(container);
    act(() => {
      toggle.focus();
    });
    pressKey('Tab', { shiftKey: true });
    const drawer = document.getElementById('admin-menu');
    const focusables = drawer.querySelectorAll('a[href], button');
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
    root.unmount();
  });

  it('pulls stray focus back inside the trap', () => {
    const { container, root } = renderShell();
    openDrawer(container);
    const outside = document.createElement('button');
    outside.textContent = 'behind the overlay';
    document.body.appendChild(outside);
    act(() => {
      outside.focus();
    });
    expect(document.activeElement).toBe(outside);
    pressKey('Tab');
    expect(document.activeElement).toBe(
      container.querySelector('button[aria-controls="admin-menu"]')
    );
    root.unmount();
  });

  it('closes on Esc and returns focus to the toggle', () => {
    const { container, root } = renderShell();
    const toggle = openDrawer(container);
    expect(document.getElementById('admin-menu')).not.toBeNull();
    pressKey('Escape');
    expect(document.getElementById('admin-menu')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle);
    root.unmount();
  });

  it('locks body scroll while open and restores it on close', () => {
    const { container, root } = renderShell();
    openDrawer(container);
    expect(document.body.style.overflow).toBe('hidden');
    pressKey('Escape');
    expect(document.body.style.overflow).toBe('');
    root.unmount();
  });

  it('never uses outline-none anywhere in the shell (Tailwind v4 focus-ring killer)', () => {
    const { container, root } = renderShell();
    openDrawer(container);
    const all = [container, document.getElementById('admin-menu')]
      .filter(Boolean)
      .flatMap((node) => Array.from(node.querySelectorAll('*')));
    for (const el of all) {
      expect(String(el.className)).not.toMatch(/(?:^|\s)outline-none(?:\s|$)/);
    }
    root.unmount();
  });
});
