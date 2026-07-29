// @vitest-environment jsdom
//
// StatCard (Task 2) has three states that must never collapse into one
// another: a real value, a legitimate `0` with an explanation, and `null`
// (query failed) with a different explanation. The task brief's explicit
// instruction — "never a bare 'No data'" — is asserted directly.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const { default: StatCard } = await import('@/components/admin/StatCard.jsx');

function renderInDl(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement('dl', null, el));
  });
  return { container, root };
}

describe('StatCard', () => {
  it('renders a real value with the monospace numeral rule and its caption', () => {
    const { container, root } = renderInDl(
      React.createElement(StatCard, {
        label: 'Total alumni',
        value: 207,
        caption: 'Verified survey rows.',
      })
    );
    const numeral = container.querySelector('.font-mono');
    expect(numeral).not.toBeNull();
    expect(numeral.textContent).toBe('207');
    expect(container.textContent).toContain('Verified survey rows.');
    root.unmount();
  });

  it('formats large numbers with thousands separators', () => {
    const { container, root } = renderInDl(
      React.createElement(StatCard, { label: 'x', value: 12345 })
    );
    expect(container.querySelector('.font-mono').textContent).toBe('12,345');
    root.unmount();
  });

  it('a legitimate zero shows the explanatory zeroHint, never a bare "No data"', () => {
    const { container, root } = renderInDl(
      React.createElement(StatCard, {
        label: 'Pending contributions',
        value: 0,
        caption: 'Ordinary caption, should not show alongside zeroHint.',
        zeroHint: 'Nothing waiting on review. Submissions will appear here once sent.',
      })
    );
    expect(container.querySelector('.font-mono').textContent).toBe('0');
    expect(container.textContent).toContain('Nothing waiting on review');
    expect(container.textContent).not.toContain('Ordinary caption');
    expect(container.textContent.toLowerCase()).not.toContain('no data');
    root.unmount();
  });

  it('an unavailable (null) count reads as failed, not as a real zero', () => {
    const { container, root } = renderInDl(
      React.createElement(StatCard, {
        label: 'Total alumni',
        value: null,
        zeroHint: 'should not appear for null',
      })
    );
    expect(container.querySelector('.font-mono').textContent).toBe('—');
    expect(container.textContent).not.toContain('should not appear for null');
    expect(container.textContent.toLowerCase()).not.toContain('no data');
    root.unmount();
  });
});
