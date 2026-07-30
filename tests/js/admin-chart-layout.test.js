// Unit tests for lib/admin/chartLayout.js.
//
// This module exists because of a bug that only appeared at 390px: with a
// flat 38px per bar, a four-line label like "Accountancy & Commerce
// (Perniagaan, Ekonomi etc)" in a 104px axis column rendered on top of the
// label below it. Caught by screenshot, not by any test — so the arithmetic
// that replaced it is pinned here.
import { describe, it, expect } from 'vitest';
import {
  axisWidthFor,
  estimateLines,
  rowHeightFor,
  chartHeightFor,
} from '@/lib/admin/chartLayout';

// The real option strings, which are what actually broke.
const STREAMS = [
  { label: 'Science (Biology, Chemistry etc)', value: 81 },
  { label: 'Accountancy & Commerce (Perniagaan, Ekonomi etc)', value: 65 },
  {
    label: 'Technical & Vocational (Sains Komputer, Rekacipta, Lukisan Kejuruteraan etc)',
    value: 55,
  },
  { label: 'Arts', value: 47 },
  { label: 'Islamic Studies', value: 31 },
  { label: 'Sports Science', value: 20 },
];

const PHONE_AXIS = axisWidthFor(390);
const DESKTOP_AXIS = axisWidthFor(1440);

describe('axisWidthFor', () => {
  it('narrows the label column on small viewports', () => {
    expect(axisWidthFor(390)).toBeLessThan(axisWidthFor(1440));
  });

  it('never returns a width too small to show anything', () => {
    for (const w of [0, 240, 320, 390, 768, 1024, 1920]) {
      expect(axisWidthFor(w)).toBeGreaterThanOrEqual(100);
    }
  });
});

describe('estimateLines', () => {
  it('keeps a short label on one line', () => {
    expect(estimateLines('Arts', DESKTOP_AXIS)).toBe(1);
  });

  it('wraps a long label more in a narrow column than a wide one', () => {
    const long = 'Technical & Vocational (Sains Komputer, Rekacipta, Lukisan Kejuruteraan etc)';
    expect(estimateLines(long, PHONE_AXIS)).toBeGreaterThan(
      estimateLines(long, DESKTOP_AXIS)
    );
  });

  it('returns at least one line for empty or missing text', () => {
    expect(estimateLines('', DESKTOP_AXIS)).toBe(1);
    expect(estimateLines(undefined, DESKTOP_AXIS)).toBe(1);
    expect(estimateLines(null, DESKTOP_AXIS)).toBe(1);
  });

  it('does not split a single unbreakable word across lines', () => {
    // Word wrap cannot break inside a word, so one very long word is one
    // line however narrow the column — pretending otherwise would
    // under-reserve height everywhere else.
    expect(estimateLines('Kejuruteraan', 40)).toBe(1);
  });
});

describe('rowHeightFor — the overlap guard', () => {
  it('gives a phone-width chart more room per row than a desktop one', () => {
    expect(rowHeightFor(STREAMS, PHONE_AXIS)).toBeGreaterThan(
      rowHeightFor(STREAMS, DESKTOP_AXIS)
    );
  });

  it('reserves at least as much height as the longest label needs', () => {
    // The actual invariant that was violated: row height must be no smaller
    // than the wrapped text it has to contain.
    const LINE_HEIGHT = 14;
    for (const axis of [PHONE_AXIS, DESKTOP_AXIS]) {
      const longest = Math.max(...STREAMS.map((e) => estimateLines(e.label, axis)));
      expect(rowHeightFor(STREAMS, axis)).toBeGreaterThanOrEqual(longest * LINE_HEIGHT);
    }
  });

  it('never drops below the touch-comfortable minimum for short labels', () => {
    const short = [{ label: 'Yes', value: 1 }, { label: 'No', value: 2 }];
    expect(rowHeightFor(short, DESKTOP_AXIS)).toBeGreaterThanOrEqual(38);
  });
});

describe('chartHeightFor', () => {
  it('is fixed for a linear scale, whose categories are short numbers', () => {
    const scale = [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }));
    expect(chartHeightFor(scale, 'num', PHONE_AXIS)).toBe(
      chartHeightFor(scale, 'num', DESKTOP_AXIS)
    );
  });

  it('grows with the number of bars', () => {
    const two = STREAMS.slice(0, 2);
    expect(chartHeightFor(STREAMS, 'multi', DESKTOP_AXIS)).toBeGreaterThan(
      chartHeightFor(two, 'multi', DESKTOP_AXIS)
    );
  });

  it('is taller on a phone than on a desktop for the same data', () => {
    expect(chartHeightFor(STREAMS, 'multi', PHONE_AXIS)).toBeGreaterThan(
      chartHeightFor(STREAMS, 'multi', DESKTOP_AXIS)
    );
  });

  it('leaves enough total height that no two rows can overlap', () => {
    // The regression itself, stated directly: total height must cover every
    // label's wrapped text stacked one after another.
    const axis = PHONE_AXIS;
    const needed = STREAMS.reduce(
      (sum, e) => sum + estimateLines(e.label, axis) * 14,
      0
    );
    expect(chartHeightFor(STREAMS, 'multi', axis)).toBeGreaterThanOrEqual(needed);
  });

  it('handles an empty or missing series without collapsing to zero', () => {
    expect(chartHeightFor([], 'multi', DESKTOP_AXIS)).toBeGreaterThan(0);
    expect(chartHeightFor(undefined, 'multi', DESKTOP_AXIS)).toBeGreaterThan(0);
  });
});
