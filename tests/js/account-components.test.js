// @vitest-environment jsdom
//
// Component-level tests for the /account UI:
//  - OrphanCard: honest orphan messaging, one-click retry against
//    /api/questions with the SAME stored answers, calm failure handling;
//  - DeleteAccountSection: the deliberate two-step confirmation (open
//    dialog, then type DELETE exactly) that makes the signup page's
//    delete promise genuine — a single accidental tap must never delete
//    anything, and no `outline-none` anywhere silently kills a focus
//    ring (the project's own documented Tailwind v4 footgun).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const pushSpy = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) =>
    React.createElement('a', { href, ...props }, children),
}));

import OrphanCard from '@/components/account/OrphanCard.jsx';
import DeleteAccountSection from '@/components/account/DeleteAccountSection.jsx';

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

function pressKey(key, options = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, ...options })
    );
  });
}

// React tracks its own value setter on controlled inputs, so a plain
// `input.value = '…'` assignment is invisible to it — the native prototype
// setter must be used instead for the subsequent `input` event to trigger
// the onChange handler, exactly as a real keystroke would.
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  'value'
).set;

function typeInto(input, value) {
  act(() => {
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  pushSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OrphanCard', () => {
  const answers = { school: 'Private School', stream: ['Arts'] };

  it('renders the honest orphan message, never a broken/empty row', () => {
    const { container, root } = mount(
      React.createElement(OrphanCard, { answers, dateLabel: '28 July 2026' })
    );
    expect(container.textContent).toContain("Answers saved, prediction didn't finish.");
    expect(container.textContent).toContain('28 July 2026');
    root.unmount();
  });

  it('retry resubmits the SAME stored answers to /api/questions and navigates on success', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const { container, root } = mount(
      React.createElement(OrphanCard, { answers, dateLabel: '28 July 2026' })
    );
    const button = container.querySelector('button');
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/questions');
    expect(JSON.parse(init.body)).toEqual({ answers });
    expect(pushSpy).toHaveBeenCalledWith(
      '/results/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    );
    root.unmount();
  });

  it('a failed retry shows calm copy and re-enables the button', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502 })));
    const { container, root } = mount(
      React.createElement(OrphanCard, { answers, dateLabel: '28 July 2026' })
    );
    const button = container.querySelector('button');
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(pushSpy).not.toHaveBeenCalled();
    expect(container.querySelector('button').disabled).toBe(false);
    root.unmount();
  });

  it('without readable answers, offers no retry button', () => {
    const { container, root } = mount(
      React.createElement(OrphanCard, { answers: null, dateLabel: '28 July 2026' })
    );
    expect(container.querySelectorAll('button').length).toBe(0);
    root.unmount();
  });
});

describe('DeleteAccountSection', () => {
  function openDialog(container) {
    const trigger = container.querySelector('button');
    act(() => {
      trigger.click();
    });
    return trigger;
  }

  it('the dialog is absent from the DOM until the trigger is clicked', () => {
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    openDialog(container);
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    root.unmount();
  });

  it('moves focus to the confirm input on open', () => {
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    openDialog(container);
    const input = container.querySelector('#delete-confirm');
    expect(document.activeElement).toBe(input);
    root.unmount();
  });

  it('the confirm button stays disabled until the input reads exactly DELETE', () => {
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    openDialog(container);
    const input = container.querySelector('#delete-confirm');
    const buttons = [...container.querySelectorAll('[role="alertdialog"] button')];
    const confirmBtn = buttons[buttons.length - 1];

    expect(confirmBtn.disabled).toBe(true);

    typeInto(input, 'delete');
    expect(confirmBtn.disabled).toBe(true);

    typeInto(input, 'DELETE');
    expect(confirmBtn.disabled).toBe(false);
    root.unmount();
  });

  it('Escape closes the dialog and returns focus to the trigger', () => {
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    const trigger = openDialog(container);
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    pressKey('Escape');
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    root.unmount();
  });

  it('Cancel closes without ever calling the delete API', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    openDialog(container);
    const buttons = [...container.querySelectorAll('[role="alertdialog"] button')];
    const cancelBtn = buttons[0];
    act(() => {
      cancelBtn.click();
    });
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    root.unmount();
  });

  it('confirming posts { confirm: "DELETE" } and hard-navigates home on success', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    const { container, root } = mount(React.createElement(DeleteAccountSection));
    openDialog(container);
    const input = container.querySelector('#delete-confirm');
    typeInto(input, 'DELETE');
    const buttons = [...container.querySelectorAll('[role="alertdialog"] button')];
    const confirmBtn = buttons[buttons.length - 1];

    await act(async () => {
      confirmBtn.click();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/account/delete');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ confirm: 'DELETE' });
    expect(window.location.href).toBe('/');

    window.location = originalLocation;
    root.unmount();
  });

  it('a failed delete shows calm copy, stays open, and never navigates', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => null })));
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    openDialog(container);
    const input = container.querySelector('#delete-confirm');
    typeInto(input, 'DELETE');
    const buttons = [...container.querySelectorAll('[role="alertdialog"] button')];
    const confirmBtn = buttons[buttons.length - 1];
    await act(async () => {
      confirmBtn.click();
    });
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('[role="alertdialog"]')).not.toBeNull();
    root.unmount();
  });

  it('never uses outline-none anywhere (Tailwind v4 focus-ring killer)', () => {
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    openDialog(container);
    const all = Array.from(container.querySelectorAll('*'));
    for (const el of all) {
      expect(String(el.className)).not.toMatch(/(?:^|\s)outline-none(?:\s|$)/);
    }
    root.unmount();
  });

  it('the trigger is not a filled red slab — a quiet danger treatment', () => {
    const { container, root } = mount(React.createElement(DeleteAccountSection));
    const trigger = container.querySelector('button');
    // No solid danger fill class on the entry point.
    expect(trigger.className).not.toMatch(/bg-danger\/[5-9]\d|bg-danger(?!\/)/);
    root.unmount();
  });
});
