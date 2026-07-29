// @vitest-environment jsdom
//
// The data notice is a product requirement (task brief, Plan 3 Task 2):
// the exact promise about answers, selling, and deletion must render as
// visible text — never behind a link — and the copy must live in
// lib/i18n/en.js, not inline in a component. These tests pin both.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import DataNotice from '@/components/arah/DataNotice.jsx';
import en from '@/lib/i18n/en';

const REQUIRED_COPY =
  'We store your answers and your results so you can come back to them. ' +
  'We do not sell them or share them with universities. ' +
  'You can delete everything from your account page at any time.';

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

describe('DataNotice', () => {
  it('keeps the exact required copy in lib/i18n/en.js', () => {
    expect(en.auth.notice.body).toBe(REQUIRED_COPY);
  });

  it('renders the full notice as visible text, not behind a link', () => {
    const { container, root } = mount(React.createElement(DataNotice));
    expect(container.textContent).toContain(REQUIRED_COPY);
    expect(container.querySelectorAll('a').length).toBe(0);
    root.unmount();
  });

  it('is exposed as a note with an accessible name', () => {
    const { container, root } = mount(React.createElement(DataNotice));
    const note = container.querySelector('[role="note"]');
    expect(note).not.toBeNull();
    expect(note.getAttribute('aria-label')).toBe(en.auth.notice.title);
    root.unmount();
  });
});
