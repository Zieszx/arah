// @vitest-environment jsdom
//
// The `[ ]` brackets in Kicker are decorative. A screen reader must
// announce the label text sensibly, not the bracket glyphs.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import Kicker from '@/components/arah/Kicker.jsx';

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

describe('Kicker', () => {
  it('visually renders the label wrapped in brackets', () => {
    const { container, root } = mount(React.createElement(Kicker, null, 'Step one'));
    expect(container.textContent).toBe('[ Step one ]');
    root.unmount();
  });

  it('hides both bracket glyphs from the accessibility tree via aria-hidden', () => {
    const { container, root } = mount(React.createElement(Kicker, null, 'Step one'));
    const hidden = container.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBe(2);
    const hiddenText = Array.from(hidden).map((n) => n.textContent.trim());
    expect(hiddenText).toEqual(['[', ']']);
    root.unmount();
  });
});
