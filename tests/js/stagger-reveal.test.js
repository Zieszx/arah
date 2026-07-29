// @vitest-environment jsdom
//
// §5b staggered reveal. Two things are load-bearing:
//  1. The exact tuned values (60ms step, 420ms, 16px, ease-out, once) are
//     client-chosen — pinned here so a "taste" edit goes red.
//  2. The reduced-motion path renders children at final position, visible,
//     immediately — never `opacity: 0` waiting for an animation that will
//     not run (§5b's explicit trap: a reduced-motion user must never stare
//     at a blank page).
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import StaggerReveal, { STAGGER } from '@/components/motion/StaggerReveal.jsx';

function mockMatchMedia({ reduced }) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
}

beforeEach(() => {
  // Deterministic IntersectionObserver: report everything in view at once.
  window.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe(el) {
      this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }]);
    }
    unobserve() {}
    disconnect() {}
  };
});

async function mount(children) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(React.createElement(StaggerReveal, null, children));
  });
  return { container, root };
}

const three = [
  React.createElement('p', { key: 'a' }, 'first'),
  React.createElement('p', { key: 'b' }, 'second'),
  React.createElement('p', { key: 'c' }, 'third'),
];

describe('STAGGER spec values (§5b — client-chosen, do not adjust)', () => {
  it('pins the tuned configuration exactly', () => {
    expect(STAGGER.delayStep).toBe(60);
    expect(STAGGER.duration).toBe(420);
    expect(STAGGER.translateY).toBe(16);
    expect(STAGGER.easing).toEqual([0.16, 1, 0.3, 1]);
    expect(STAGGER.once).toBe(true);
    expect(STAGGER.maxStagger).toBe(8);
  });
});

describe('StaggerReveal reduced-motion behaviour', () => {
  it('renders every child visible at final position immediately', async () => {
    mockMatchMedia({ reduced: true });
    const { container, root } = await mount(three);

    // Capability effect has flushed inside act(); reduced stays disabled.
    const wrappers = container.firstChild.children;
    expect(wrappers.length).toBe(3);
    for (const el of wrappers) {
      // Plain divs — no hidden initial state, no transform, no opacity.
      expect(el.style.opacity).toBe('');
      expect(el.style.transform).toBe('');
    }
    expect(container.textContent).toContain('first');
    expect(container.textContent).toContain('third');

    root.unmount();
  });
});

describe('StaggerReveal motion-enabled behaviour', () => {
  it('NEGATIVE CONTROL: remounts children into animated wrappers once capability is confirmed', async () => {
    mockMatchMedia({ reduced: false });
    const { container, root } = await mount(three);

    // enabled flipped true inside act(): children remounted as motion.divs
    // with a real hidden initial state — the reduced-motion path above
    // never produces this.
    const wrappers = [...container.firstChild.children];
    expect(wrappers.length).toBe(3);
    const styled = wrappers.filter(
      (el) => el.style.opacity !== '' || el.style.transform !== ''
    );
    expect(styled.length).toBeGreaterThan(0);

    root.unmount();
  });
});
