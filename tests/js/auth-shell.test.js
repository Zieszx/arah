// @vitest-environment jsdom
//
// §5c sliding overlay panel (docs/design/visual-design-system.md). Covers
// the parts a unit test can actually pin down:
//  - both forms carry distinct field ids (trap 2 — two password fields in
//    one document);
//  - the covered pane is `inert` and the revealed one is not, and this
//    flips correctly when the active side changes (trap 1);
//  - reduced motion collapses the post-transition focus/announce delay to
//    zero instead of the real 380ms/200ms (trap 4's JS-side half — the CSS
//    half is the site-wide rule in app/globals.css, already covered by
//    flow-button.test.js's sibling assertions elsewhere).
//
// The real Server Action module (app/(auth)/actions.js) pulls in
// lib/supabase/admin.js, which imports the `server-only` package — that
// throws outside a bundler that understands the 'use client'/'use server'
// boundary (confirmed via a throwaway import smoke test), which plain
// Vitest is not. Mocking the actions module here is the direct analogue of
// what Next's compiler does at that boundary in the real app: replace the
// action with a callable reference, never inline the server module.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('../../app/(auth)/actions.js', () => ({
  login: vi.fn(),
  signup: vi.fn(),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) =>
    React.createElement('a', { href, ...props }, children),
}));

let mockPathname = '/signup';
let mockSearch = '';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

let AuthShell;

function mockMatchMedia({ reduced = false, desktop = true } = {}) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion')
      ? reduced
      : query.includes('min-width')
        ? desktop
        : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

const QUOTES = ['Take your time and choose wisely.', 'Follow your interest, not the crowd.'];

beforeEach(() => {
  mockPathname = '/signup';
  mockSearch = '';
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('AuthShell field identity (§5c trap 2)', () => {
  it('gives each form and its fields distinct ids, keeping form field names intact', async () => {
    mockMatchMedia();
    const { root } = await import('@/app/(auth)/auth-shell.jsx').then(({ default: Comp }) => {
      AuthShell = Comp;
      return mount(React.createElement(Comp, { quotes: QUOTES }));
    });

    expect(document.getElementById('signup-form')).not.toBeNull();
    expect(document.getElementById('login-form')).not.toBeNull();
    expect(document.getElementById('signup-email')).not.toBeNull();
    expect(document.getElementById('login-email')).not.toBeNull();
    expect(document.getElementById('signup-password')).not.toBeNull();
    expect(document.getElementById('login-password')).not.toBeNull();

    // No duplicate ids anywhere in the document — the classic trap of
    // mounting two forms with id="email" side by side.
    const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);

    // `name` stays the plain field name (what the Server Action reads via
    // formData.get) — only `id` needed to become unique.
    expect(document.getElementById('signup-email').getAttribute('name')).toBe('email');
    expect(document.getElementById('login-email').getAttribute('name')).toBe('email');

    root.unmount();
  });
});

describe('AuthShell inert covered pane (§5c trap 1)', () => {
  it('marks the login pane inert while signup is active, and vice versa', async () => {
    mockMatchMedia();
    const { default: Comp } = await import('@/app/(auth)/auth-shell.jsx');
    mockPathname = '/signup';
    const { container, root } = mount(React.createElement(Comp, { quotes: QUOTES }));

    const signupPane = container.querySelector('[data-auth-pane="signup"]');
    const loginPane = container.querySelector('[data-auth-pane="login"]');
    expect(signupPane.hasAttribute('inert')).toBe(false);
    expect(loginPane.hasAttribute('inert')).toBe(true);

    // Flip the mocked route and re-render the SAME instance (not a
    // remount) — this is what a real /signup -> /login client-side
    // navigation does to this component, since it lives in the shared
    // layout rather than in either page.
    mockPathname = '/login';
    act(() => {
      root.render(React.createElement(Comp, { quotes: QUOTES }));
    });

    expect(signupPane.hasAttribute('inert')).toBe(true);
    expect(loginPane.hasAttribute('inert')).toBe(false);

    root.unmount();
  });
});

describe('AuthShell reduced motion (§5c trap 4)', () => {
  it('moves focus to the revealed field almost immediately when reduced motion is on', async () => {
    mockMatchMedia({ reduced: true, desktop: true });
    const { default: Comp } = await import('@/app/(auth)/auth-shell.jsx');
    mockPathname = '/signup';
    const { container, root } = mount(React.createElement(Comp, { quotes: QUOTES }));

    // Flush the matchMedia effects (capability isn't known until an effect
    // runs) before treating this as "settled" — mirrors the project's
    // existing StaggerReveal/MatchBar test pattern.
    act(() => {
      vi.advanceTimersByTime(0);
    });

    mockPathname = '/login';
    act(() => {
      root.render(React.createElement(Comp, { quotes: QUOTES }));
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(document.activeElement?.id).toBe('login-email');
    expect(container.textContent).toContain('Sign-in form shown.');

    root.unmount();
  });

  it('does NOT move focus on first mount (no unrequested focus change)', async () => {
    mockMatchMedia({ reduced: true, desktop: true });
    const { default: Comp } = await import('@/app/(auth)/auth-shell.jsx');
    mockPathname = '/signup';
    const { root } = mount(React.createElement(Comp, { quotes: QUOTES }));
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(document.activeElement?.id).not.toBe('signup-email');
    root.unmount();
  });

  it('waits the full 380ms before moving focus when motion is not reduced (desktop)', async () => {
    mockMatchMedia({ reduced: false, desktop: true });
    const { default: Comp } = await import('@/app/(auth)/auth-shell.jsx');
    mockPathname = '/signup';
    const { root } = mount(React.createElement(Comp, { quotes: QUOTES }));
    act(() => {
      vi.advanceTimersByTime(0);
    });

    mockPathname = '/login';
    act(() => {
      root.render(React.createElement(Comp, { quotes: QUOTES }));
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.activeElement?.id).not.toBe('login-email');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(document.activeElement?.id).toBe('login-email');

    root.unmount();
  });
});
