// @vitest-environment jsdom
//
// useQuizState: max_select enforcement at the source, the localStorage
// mirror (write on change, restore on mount, sanitize hostile data), and
// the payload builder's pre-U marginalisation contract.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { useQuizState, NOT_SURE, buildPayload, orderedGroups } from '@/lib/quiz/useQuizState';
import { getSpec } from '@/lib/features';

const KEY = `arah:quiz:${getSpec().version}`;

// The hook's latest return value is captured from an effect (not during
// render — assigning module state mid-render breaks the rules of hooks).
// act() flushes effects, so `state` is always current after each act.
let state;
function Probe() {
  const s = useQuizState();
  useEffect(() => {
    state = s;
  });
  return null;
}

let container;
let root;
function mountProbe() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(React.createElement(Probe));
  });
}
function unmountProbe() {
  if (root) act(() => root.unmount());
  container?.remove();
  root = null;
  container = null;
}

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  unmountProbe();
  state = undefined;
});

const groupByKey = (key) => orderedGroups().find((g) => g.key === key);

describe('max_select enforcement', () => {
  it('refuses the selection past the cap and says why — never silently', () => {
    mountProbe();
    const multi = orderedGroups().find((g) => g.type === 'multi' && g.max_select);
    const picks = multi.options.slice(0, multi.max_select + 1);

    for (const opt of picks.slice(0, multi.max_select)) {
      act(() => state.toggle(multi, opt));
    }
    expect(state.answers[multi.key]).toEqual(picks.slice(0, multi.max_select));
    expect(state.atLimit(multi)).toBe(true);
    expect(state.limitNotice).toBeNull();

    // The tap over the cap: state unchanged, notice set.
    act(() => state.toggle(multi, picks[multi.max_select]));
    expect(state.answers[multi.key]).toEqual(picks.slice(0, multi.max_select));
    expect(state.limitNotice).toContain(String(multi.max_select));

    // Unselecting is always allowed and clears the notice.
    act(() => state.toggle(multi, picks[0]));
    expect(state.answers[multi.key]).toEqual(picks.slice(1, multi.max_select));
    expect(state.limitNotice).toBeNull();
    expect(state.atLimit(multi)).toBe(false);
  });
});

describe('localStorage mirror', () => {
  it('persists every change and restores answers and step on a fresh mount', () => {
    mountProbe();
    const single = orderedGroups().find((g) => g.type === 'single' && !g.optional);
    const num = orderedGroups().find((g) => g.type === 'num');

    act(() => state.choose(single, single.options[1]));
    act(() => state.setNumber(num, num.min + 1));
    act(() => state.goTo(3));

    // Mirrored synchronously (effect) on each change.
    const stored = JSON.parse(window.localStorage.getItem(KEY));
    expect(stored.answers[single.key]).toBe(single.options[1]);
    expect(stored.answers[num.key]).toBe(num.min + 1);
    expect(stored.step).toBe(3);

    // A refresh: unmount, remount, everything back.
    unmountProbe();
    mountProbe();
    expect(state.ready).toBe(true);
    expect(state.answers[single.key]).toBe(single.options[1]);
    expect(state.answers[num.key]).toBe(num.min + 1);
    expect(state.step).toBe(3);
  });

  it('sanitizes stale or hostile stored data instead of restoring it', () => {
    const multi = orderedGroups().find((g) => g.type === 'multi' && g.max_select);
    const single = orderedGroups().find((g) => g.type === 'single' && !g.optional);
    const num = orderedGroups().find((g) => g.type === 'num');
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        step: 99,
        answers: {
          [multi.key]: ['Option that no longer exists', multi.options[0]],
          [single.key]: 'Dropped option',
          [num.key]: num.max + 100,
          not_a_real_group: 'x',
        },
      }),
    );
    mountProbe();
    expect(state.answers[multi.key]).toEqual([multi.options[0]]); // unknown option dropped
    expect(state.answers[single.key]).toBeUndefined(); // unknown single dropped
    expect(state.answers[num.key]).toBeUndefined(); // out-of-range number dropped
    expect(state.answers.not_a_real_group).toBeUndefined();
    expect(state.step).toBeLessThan(state.total); // step clamped into range
  });

  it('treats corrupt JSON as a fresh start, never a crash', () => {
    window.localStorage.setItem(KEY, '{not json');
    mountProbe();
    expect(state.ready).toBe(true);
    expect(state.answers).toEqual({});
    expect(state.step).toBe(0);
  });
});

describe('pre-U marginalisation contract', () => {
  function completeAnswers() {
    const answers = {};
    for (const g of orderedGroups()) {
      if (g.key === 'preu') continue;
      if (g.type === 'num') answers[g.key] = g.min;
      else if (g.type === 'multi') answers[g.key] = [g.options[0]];
      else answers[g.key] = g.options[0];
    }
    return answers;
  }

  it('omits preu from the payload when the student is not sure', () => {
    const groups = orderedGroups();
    const payload = buildPayload(groups, { ...completeAnswers(), preu: NOT_SURE });
    expect(payload).not.toHaveProperty('preu');
  });

  it('omits preu when it was never answered, and never blocks Next on it', () => {
    const groups = orderedGroups();
    const payload = buildPayload(groups, completeAnswers());
    expect(payload).not.toHaveProperty('preu');

    mountProbe();
    const preuIndex = groups.findIndex((g) => g.key === 'preu');
    act(() => state.goTo(preuIndex));
    let advanced;
    act(() => {
      advanced = state.next(); // no preu answer at all
    });
    expect(advanced).toBe(true);
    expect(state.stepError).toBeNull();
  });

  it('passes a chosen route through unchanged', () => {
    const groups = orderedGroups();
    const preu = groupByKey('preu');
    const payload = buildPayload(groups, { ...completeAnswers(), preu: preu.options[0] });
    expect(payload.preu).toBe(preu.options[0]);
  });
});
