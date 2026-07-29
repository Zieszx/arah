// @vitest-environment jsdom
//
// The rendered quiz must match services/ml/feature_spec.json *exactly* —
// asserted programmatically against the JSON on disk, never against
// hardcoded expectations. A hardcoded option that drifts from the spec
// produces silently wrong predictions; this file is the tripwire.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import OptionGrid from '@/components/quiz/OptionGrid.jsx';
import { orderedGroups, NOT_SURE } from '@/lib/quiz/useQuizState';

const specOnDisk = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'services/ml/feature_spec.json'), 'utf8'),
);

const mounted = [];
function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  mounted.push({ container, root });
  return container;
}

afterEach(() => {
  while (mounted.length) {
    const { container, root } = mounted.pop();
    act(() => root.unmount());
    container.remove();
  }
});

function renderGroup(group, value) {
  return mount(
    React.createElement(OptionGrid, {
      group,
      value,
      atLimit: false,
      choose: () => {},
      toggle: () => {},
      setNumber: () => {},
    }),
  );
}

describe('ordered display groups', () => {
  it('are exactly the spec groups — none lost, none invented', () => {
    const displayKeys = orderedGroups().map((g) => g.key);
    const specKeys = specOnDisk.groups.map((g) => g.key);
    expect([...displayKeys].sort()).toEqual([...specKeys].sort());
    expect(displayKeys).toHaveLength(specKeys.length);
  });
});

describe('rendered options match feature_spec.json exactly', () => {
  for (const specGroup of specOnDisk.groups) {
    it(`"${specGroup.key}" renders every spec option, in spec order, and nothing else`, () => {
      const group = orderedGroups().find((g) => g.key === specGroup.key);
      expect(group).toBeDefined();

      const container = renderGroup(group, undefined);
      const inputs = [...container.querySelectorAll('input')];
      const values = inputs.map((i) => i.value);

      if (specGroup.type === 'num') {
        const expected = [];
        for (let n = specGroup.min; n <= specGroup.max; n += 1) expected.push(String(n));
        expect(values).toEqual(expected);
        for (const input of inputs) expect(input.type).toBe('radio');
        return;
      }

      const expected = specGroup.optional
        ? [...specGroup.options, NOT_SURE]
        : [...specGroup.options];
      expect(values).toEqual(expected);

      const expectedType = specGroup.type === 'multi' ? 'checkbox' : 'radio';
      for (const input of inputs) expect(input.type).toBe(expectedType);
      // All inputs in one group share a name → one native radio group.
      for (const input of inputs) expect(input.name).toBe(specGroup.key);
    });
  }

  it('the optional pre-U style group renders "Not sure yet" as a real, enabled input', () => {
    const optionalGroup = orderedGroups().find((g) => g.optional);
    expect(optionalGroup).toBeDefined(); // the spec currently has one (preu)
    const container = renderGroup(optionalGroup, undefined);
    const notSure = container.querySelector(`input[value="${NOT_SURE}"]`);
    expect(notSure).not.toBeNull();
    expect(notSure.disabled).toBe(false);
    // First-class: same tag, same name, not pre-selected.
    expect(notSure.checked).toBe(false);
    const anyChecked = [...container.querySelectorAll('input')].some((i) => i.checked);
    expect(anyChecked).toBe(false); // nothing pre-selected, ever
  });

  it('survey typos render their corrected label, but the submitted value stays the raw spec string', () => {
    const traits = orderedGroups().find((g) => g.key === 'traits');
    const container = renderGroup(traits, undefined);
    // The input the model side will see keeps the raw (typo) value...
    const rawInput = container.querySelector('input[value="Resiliant"]');
    expect(rawInput).not.toBeNull();
    // ...while the human-visible card text is corrected.
    const labelText = rawInput.closest('label').textContent;
    expect(labelText).toContain('Resilient');
    expect(labelText).not.toContain('Resiliant');
    // And no input anywhere carries the display spelling as its value.
    expect(container.querySelector('input[value="Resilient"]')).toBeNull();
  });

  it('at the max_select limit, unchecked options stay enabled (clicks must never vanish silently)', () => {
    const group = orderedGroups().find((g) => g.type === 'multi' && g.max_select);
    const container = mount(
      React.createElement(OptionGrid, {
        group,
        value: group.options.slice(0, group.max_select),
        atLimit: true,
        choose: () => {},
        toggle: () => {},
        setNumber: () => {},
      }),
    );
    const unchecked = [...container.querySelectorAll('input')].filter((i) => !i.checked);
    expect(unchecked.length).toBeGreaterThan(0);
    for (const input of unchecked) {
      expect(input.disabled).toBe(false); // still focusable, still clickable
      expect(input.getAttribute('aria-disabled')).toBe('true'); // but announced as unavailable
    }
  });
});
