// @vitest-environment jsdom
//
// MatchBar shows a student their result - the number must be readable and
// correct at all times, and a reduced-motion user must never see a
// mid-animation first paint. useMotionCapability() starts `enabled: false`
// on every render (capability isn't knowable until an effect runs) and
// only flips `true` post-mount for capable users, so MatchBar keys its
// fill on `enabled` to force a genuine fresh mount (and a real 0 -> final
// transition) only once motion is confirmed allowed; the reduced-motion
// path never remounts and therefore never shows a transient 0% frame.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import MatchBar from '@/components/arah/MatchBar.jsx';

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

function getFill(container) {
  return container.querySelector('[style*="background-image"]');
}

describe('MatchBar reduced-motion behaviour', () => {
  it('renders the fill at final width on first paint, with no animation, under reduced motion', async () => {
    const { container, root } = mountWithMatchMedia({ reduced: true });

    await act(async () => {
      root.render(
        React.createElement(MatchBar, { label: 'Data Science', percent: 73, tone: 'cyan' })
      );
    });

    // `act()` flushes useMotionCapability's capability-detection effect
    // before this call returns, so by the time we can inspect the DOM the
    // effect has already run. Under reduced motion that doesn't matter:
    // `enabled` resolves to false either way, the fill's `key` never
    // changes, and it renders at final width - never 0% - on this first
    // render and every one after it.
    expect(getFill(container).style.width).toBe('73%');

    // Let the capability-detection effect run and settle.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(getFill(container).style.width).toBe('73%');
    // The percentage text is a plain node, independent of the bar, and is
    // correct throughout.
    expect(container.textContent).toContain('73%');

    root.unmount();
  });

  it('clamps out-of-range percent values into 0-100', async () => {
    const { container, root } = mountWithMatchMedia({ reduced: true });

    await act(async () => {
      root.render(React.createElement(MatchBar, { label: 'Over', percent: 140 }));
    });

    expect(getFill(container).style.width).toBe('100%');
    expect(container.textContent).toContain('100%');

    root.unmount();
  });

  // Negative control: proves the reduced-motion assertions above
  // discriminate real behaviour. When motion is enabled, the fill's key
  // swaps once useMotionCapability's effect confirms capability, forcing a
  // genuine fresh mount with `initial={{ width: '0%' }}` - so a real 0%
  // frame exists for capable users, which the reduced-motion path above
  // never produces.
  it('NEGATIVE CONTROL: mounts the fill fresh at 0% once motion is confirmed enabled, unlike the reduced-motion path', async () => {
    const { container, root } = mountWithMatchMedia({ reduced: false });

    // `act()` flushes useMotionCapability's capability-detection effect
    // before this call returns, so by the time we can inspect the DOM,
    // `enabled` has already flipped true and the fill has already
    // remounted fresh with `initial={{ width: '0%' }}` applied - a real
    // 0% state the reduced-motion path above never produces, since that
    // path's key never changes and so never remounts.
    await act(async () => {
      root.render(React.createElement(MatchBar, { label: 'Enabled', percent: 60 }));
    });

    expect(getFill(container).style.width).toBe('0%');

    root.unmount();
  });
});
