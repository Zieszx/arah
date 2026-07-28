// @vitest-environment jsdom
//
// ConfidenceBadge is an honesty feature, not decoration: two fields in the
// real dataset have only 7 and 9 students behind them, and a student must
// never mistake a thin sample for a real recommendation. These tests lock
// the tier boundaries exactly (9/10/19/20) and prove the caveat sentence
// only appears - with the exact N - below the medium threshold.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ConfidenceBadge, {
  getConfidenceTier,
} from '@/components/arah/ConfidenceBadge.jsx';

describe('getConfidenceTier boundaries', () => {
  it('classifies 9 as low - just under the medium threshold', () => {
    expect(getConfidenceTier(9)).toBe('low');
  });

  it('classifies 10 as medium - the medium threshold itself', () => {
    expect(getConfidenceTier(10)).toBe('medium');
  });

  it('classifies 19 as medium - just under the high threshold', () => {
    expect(getConfidenceTier(19)).toBe('medium');
  });

  it('classifies 20 as high - the high threshold itself', () => {
    expect(getConfidenceTier(20)).toBe('high');
  });

  it('treats a missing or invalid sample size as low, never high', () => {
    expect(getConfidenceTier(undefined)).toBe('low');
    expect(getConfidenceTier(null)).toBe('low');
    expect(getConfidenceTier(NaN)).toBe('low');
  });
});

function mount(sampleSize) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(ConfidenceBadge, { sampleSize }));
  });
  return { container, root };
}

describe('ConfidenceBadge rendering', () => {
  it('renders the exact honesty sentence for the real low-sample case (n=7)', () => {
    const { container, root } = mount(7);
    expect(container.textContent).toContain('Low confidence');
    expect(container.textContent).toContain(
      'Only 7 students in our data chose this — treat it as a lead, not a recommendation.'
    );
    root.unmount();
  });

  it('renders the exact honesty sentence for the real low-sample case (n=9)', () => {
    const { container, root } = mount(9);
    expect(container.textContent).toContain('Only 9 students');
    expect(container.textContent).toContain('treat it as a lead, not a recommendation.');
    root.unmount();
  });

  it('does not render the honesty sentence at medium tier (n=10)', () => {
    const { container, root } = mount(10);
    expect(container.textContent).toContain('Medium confidence');
    expect(container.textContent).not.toContain('treat it as a lead');
    root.unmount();
  });

  it('does not render the honesty sentence at high tier (n=20)', () => {
    const { container, root } = mount(20);
    expect(container.textContent).toContain('High confidence');
    expect(container.textContent).not.toContain('treat it as a lead');
    root.unmount();
  });
});
