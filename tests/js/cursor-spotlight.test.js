// @vitest-environment jsdom
//
// Proves CursorSpotlight's reduced-motion behaviour, which is deliberately
// different from ParticleField's: it never returns null. When motion is
// disabled it renders a static, centred glow at reduced opacity (so touch
// and reduced-motion users still get the depth the design intends), and it
// must not attach a pointermove listener that would otherwise sit around
// doing nothing useful. When motion is enabled, pointermove must drive the
// glow via a CSS custom property, not React state.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import CursorSpotlight from '@/components/motion/CursorSpotlight.jsx';

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

let addSpy;
let removeSpy;

beforeEach(() => {
  addSpy = vi.spyOn(window, 'addEventListener');
  removeSpy = vi.spyOn(window, 'removeEventListener');
});

afterEach(() => {
  addSpy.mockRestore();
  removeSpy.mockRestore();
});

describe('CursorSpotlight reduced-motion behaviour', () => {
  it('renders a static, reduced-opacity glow and attaches no pointermove listener when disabled', async () => {
    const { container, root } = mountWithMatchMedia({ reduced: true });

    await act(async () => {
      root.render(React.createElement(CursorSpotlight));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const glow = container.firstChild;
    expect(glow).not.toBeNull();
    expect(glow.getAttribute('aria-hidden')).toBe('true');
    expect(Number(glow.style.opacity)).toBeLessThan(1);
    expect(addSpy.mock.calls.some(([type]) => type === 'pointermove')).toBe(false);

    root.unmount();
  });

  // Negative control: proves the assertions above discriminate real
  // behaviour rather than trivially passing on a component that never
  // reacts to pointer input at all.
  it('NEGATIVE CONTROL: attaches a passive pointermove listener and cleans it up when enabled', async () => {
    const { container, root } = mountWithMatchMedia({ reduced: false });

    await act(async () => {
      root.render(React.createElement(CursorSpotlight));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const glow = container.firstChild;
    expect(Number(glow.style.opacity)).toBe(1);
    const moveCall = addSpy.mock.calls.find(([type]) => type === 'pointermove');
    expect(moveCall).toBeDefined();
    expect(moveCall[2]).toMatchObject({ passive: true });

    await act(async () => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 42, clientY: 7 }));
    });
    expect(glow.style.getPropertyValue('--spot-x')).toBe('42px');
    expect(glow.style.getPropertyValue('--spot-y')).toBe('7px');

    root.unmount();
    expect(removeSpy.mock.calls.some(([type]) => type === 'pointermove')).toBe(true);
  });
});
