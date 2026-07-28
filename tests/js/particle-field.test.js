// @vitest-environment jsdom
//
// Proves the reduced-motion gate empirically, in both directions. CSS
// `prefers-reduced-motion` cannot stop a canvas RAF loop, so
// useMotionCapability() is the only gate — this is the automated guarantee
// that a student who has asked their OS for less motion gets zero canvas
// work, and it must fail loudly if that ever regresses.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ParticleField from '@/components/motion/ParticleField.jsx';

class StubIntersectionObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe(el) {
    this.cb([{ isIntersecting: true, target: el }]);
  }
  disconnect() {}
}

function stubCanvasContext() {
  const ctx = {
    clearRect() {},
    beginPath() {},
    arc() {},
    fill() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    setTransform() {},
  };
  window.HTMLCanvasElement.prototype.getContext = () => ctx;
}

let originalGetContext;

beforeEach(() => {
  originalGetContext = window.HTMLCanvasElement.prototype.getContext;
});

afterEach(() => {
  window.HTMLCanvasElement.prototype.getContext = originalGetContext;
  delete global.IntersectionObserver;
});

/**
 * Mounts <ParticleField/> with matchMedia stubbed to report the given
 * reduced-motion state, and a counting shim around requestAnimationFrame so
 * we can assert on how many frames were actually scheduled.
 */
function mountWithMatchMedia({ reduced }) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });

  let rafCalls = 0;
  const realRAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => {
    rafCalls += 1;
    return realRAF(fn);
  };
  global.requestAnimationFrame = window.requestAnimationFrame;
  global.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  return { container, root, getRafCalls: () => rafCalls };
}

describe('ParticleField reduced-motion gate', () => {
  it('renders no canvas and schedules no RAF when prefers-reduced-motion is set', async () => {
    const { container, root, getRafCalls } = mountWithMatchMedia({ reduced: true });

    await act(async () => {
      root.render(React.createElement(ParticleField));
    });
    // let useMotionCapability's own effect (matchMedia check) settle and re-render
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(container.innerHTML).toBe('');
    expect(container.querySelectorAll('canvas').length).toBe(0);
    expect(getRafCalls()).toBe(0);

    root.unmount();
  });

  // Negative control: proves the assertions above actually discriminate
  // real behaviour rather than trivially passing on a component that never
  // does anything. Without this half, a gate that was broken in a way that
  // *always* rendered nothing (e.g. a typo that always returns null) would
  // pass the test above and nobody would notice.
  it('NEGATIVE CONTROL: renders one accessible, non-interactive canvas and calls RAF when motion is enabled', async () => {
    global.IntersectionObserver = StubIntersectionObserver;
    stubCanvasContext();
    const { container, root, getRafCalls } = mountWithMatchMedia({ reduced: false });

    await act(async () => {
      root.render(React.createElement(ParticleField));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    // let at least one RAF-scheduled frame actually fire
    await act(async () => {
      await new Promise((r) => setTimeout(r, 32));
    });

    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBe(1);
    expect(getRafCalls()).toBeGreaterThan(0);

    // A screen-reader user must never encounter this canvas, and it must
    // never intercept pointer events meant for real UI beneath it.
    const canvas = canvases[0];
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.style.pointerEvents).toBe('none');

    root.unmount();
  });
});
