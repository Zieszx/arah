// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import FlowButton from '@/components/arah/FlowButton.jsx';

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

describe('FlowButton polymorphism', () => {
  it('renders a native <button type="button"> by default', () => {
    const { container, root } = mount(React.createElement(FlowButton, null, 'Start'));
    const el = container.querySelector('button');
    expect(el).not.toBeNull();
    expect(el.getAttribute('type')).toBe('button');
    expect(container.querySelector('a')).toBeNull();
    root.unmount();
  });

  it('renders a native <a href> when href is passed, with no button element', () => {
    const { container, root } = mount(
      React.createElement(FlowButton, { href: '/questions' }, 'Start')
    );
    const el = container.querySelector('a');
    expect(el).not.toBeNull();
    expect(el.getAttribute('href')).toBe('/questions');
    expect(container.querySelector('button')).toBeNull();
    root.unmount();
  });

  it('disables a <button>: sets the disabled attribute and blocks the click handler', () => {
    const onClick = vi.fn();
    const { container, root } = mount(
      React.createElement(FlowButton, { disabled: true, onClick }, 'Start')
    );
    const el = container.querySelector('button');
    expect(el.disabled).toBe(true);
    act(() => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onClick).not.toHaveBeenCalled();
    root.unmount();
  });

  it('disables a link variant via aria-disabled (anchors have no native disabled) and drops href', () => {
    const onClick = vi.fn();
    const { container, root } = mount(
      React.createElement(FlowButton, { href: '/questions', disabled: true, onClick }, 'Start')
    );
    const el = container.querySelector('a');
    expect(el.getAttribute('aria-disabled')).toBe('true');
    expect(el.hasAttribute('href')).toBe(false);
    expect(el.getAttribute('tabindex')).toBe('-1');
    act(() => {
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(onClick).not.toHaveBeenCalled();
    root.unmount();
  });

  it('applies a visible focus-visible outline utility class', () => {
    const { container, root } = mount(React.createElement(FlowButton, null, 'Start'));
    const el = container.querySelector('button');
    expect(el.className).toMatch(/focus-visible:outline-2/);
    expect(el.className).toMatch(/focus-visible:outline-cyan/);
    root.unmount();
  });
});
