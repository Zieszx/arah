// @vitest-environment jsdom
//
// Proves the reduced-motion gate for Lenis, in both directions. Hijacking
// scroll physics for someone who asked their OS for less motion is exactly
// the harm prefers-reduced-motion exists to prevent, so SmoothScroll must
// never construct a Lenis instance while reduced motion is set — and, as a
// negative control, must actually construct one (and clean it up) when
// motion is enabled, so this test can't pass on a component that never
// does anything.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import SmoothScroll from '@/components/motion/SmoothScroll.jsx';

const lenisInstances = [];

vi.mock('lenis', () => {
  return {
    default: class MockLenis {
      constructor() {
        this.raf = vi.fn();
        this.on = vi.fn();
        this.destroy = vi.fn();
        lenisInstances.push(this);
      }
    },
  };
});

vi.mock('gsap', () => {
  return {
    default: { registerPlugin: vi.fn() },
  };
});

vi.mock('gsap/ScrollTrigger', () => {
  return { ScrollTrigger: { update: vi.fn() } };
});

function mountWithMatchMedia({ reduced }) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

beforeEach(() => {
  lenisInstances.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('SmoothScroll reduced-motion gate', () => {
  it('never constructs a Lenis instance when prefers-reduced-motion is set', async () => {
    const { root } = mountWithMatchMedia({ reduced: true });

    await act(async () => {
      root.render(
        React.createElement(SmoothScroll, null, React.createElement('p', null, 'content')),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(lenisInstances.length).toBe(0);

    root.unmount();
  });

  // Negative control: proves the assertion above discriminates real
  // behaviour, not a component that simply never initialises Lenis at all.
  it('NEGATIVE CONTROL: constructs and later destroys a Lenis instance when motion is enabled', async () => {
    const { root } = mountWithMatchMedia({ reduced: false });

    await act(async () => {
      root.render(
        React.createElement(SmoothScroll, null, React.createElement('p', null, 'content')),
      );
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(lenisInstances.length).toBe(1);
    expect(lenisInstances[0].destroy).not.toHaveBeenCalled();

    root.unmount();

    expect(lenisInstances[0].destroy).toHaveBeenCalledTimes(1);
  });
});
