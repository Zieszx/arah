// @vitest-environment jsdom
//
// The results page components carry the product's honesty requirements:
//  - a suppressed field states its sample size and WHY the statistics are
//    withheld — never 0, "—", "N/A" or an imputed value;
//  - stats render only when actually present in the stored row;
//  - every field name renders through displayLabel (the stored rows keep
//    the raw survey strings — students must never see "Dentristry");
//  - the marginalised notice re-runs with the SAME stored answers plus the
//    chosen route, raw spec strings only.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

const pushSpy = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushSpy }),
}));

import AlumniContext from '@/components/results/AlumniContext.jsx';
import MarginalisedNotice from '@/components/results/MarginalisedNotice.jsx';
import ResultList from '@/components/results/ResultList.jsx';
import en from '@/lib/i18n/en';

function mockEnvironment({ reduced = true } = {}) {
  window.matchMedia = (query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
  window.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe(el) {
      this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }]);
    }
    unobserve() {}
    disconnect() {}
  };
}

async function mount(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return { container, root };
}

beforeEach(() => {
  mockEnvironment();
  pushSpy.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Entries copied from a real stored prediction row (task-4 verification).
const SUPPRESSED_ENTRY = {
  field: 'Creative Art (Fashion Design, Interior Design etc)',
  probability: 0.037203,
  alumni_count: 9,
  confidence: 'low',
  suppressed: true,
};

// alumni_band, not alumni_count: field_stats hardening (0009) never
// exposes an exact sample size for an unsuppressed field — see
// lib/quiz/submission.js#annotateRanked.
const FULL_ENTRY = {
  field: 'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)',
  probability: 0.003922,
  alumni_band: '10-19',
  confidence: 'medium',
  suppressed: false,
  avg_satisfaction: 3.37,
  pct_dissatisfied: 36.8,
  common_preu: 'Matriculation',
};

describe('AlumniContext honesty', () => {
  it('suppressed: states the sample size and why the statistics are withheld', async () => {
    const { container, root } = await mount(
      React.createElement(AlumniContext, { entry: SUPPRESSED_ENTRY })
    );
    expect(container.textContent).toBe(
      'Only 9 students in our data chose this — not enough to report satisfaction without risking identifying someone.'
    );
    // Nothing fabricated alongside it.
    expect(container.textContent).not.toContain('N/A');
    expect(container.textContent).not.toContain(en.results.statSatisfaction);
    expect(container.textContent).not.toContain(en.results.statPreu);
    root.unmount();
  });

  it('suppressed with a malformed count: still no invented number', async () => {
    const { container, root } = await mount(
      React.createElement(AlumniContext, {
        entry: { field: 'X', probability: 0.1, suppressed: true },
      })
    );
    expect(container.textContent).toBe(en.results.suppressedNoCount);
    expect(container.textContent).not.toContain('undefined');
    expect(container.textContent).not.toContain('NaN');
    root.unmount();
  });

  it('unsuppressed: renders exactly the stats present in the stored row', async () => {
    const { container, root } = await mount(
      React.createElement(AlumniContext, { entry: FULL_ENTRY })
    );
    expect(container.textContent).toContain('3.37');
    expect(container.textContent).toContain('36.8%');
    expect(container.textContent).toContain('Matriculation');
    root.unmount();
  });

  it('a genuine stored 0 (0% dissatisfied) still renders — absence, not zero, is what suppression looks like', async () => {
    const { container, root } = await mount(
      React.createElement(AlumniContext, {
        entry: {
          field: 'Media & Communication',
          probability: 0.195,
          alumni_band: '10-19',
          confidence: 'medium',
          suppressed: false,
          avg_satisfaction: 4.61,
          pct_dissatisfied: 0,
          common_preu: 'Diploma',
        },
      })
    );
    expect(container.textContent).toContain('0%');
    root.unmount();
  });

  it('unsuppressed but with no reportable stats: renders nothing at all', async () => {
    const { container, root } = await mount(
      React.createElement(AlumniContext, {
        entry: { field: 'X', probability: 0.1, alumni_band: '20-49', suppressed: false },
      })
    );
    expect(container.textContent).toBe('');
    root.unmount();
  });
});

describe('ResultList', () => {
  const entries = [FULL_ENTRY, SUPPRESSED_ENTRY];

  it('renders field names through displayLabel — the survey typo never reaches a student', async () => {
    const { container, root } = await mount(
      React.createElement(ResultList, { entries, total: 207 })
    );
    expect(container.textContent).toContain('Dentistry');
    expect(container.textContent).not.toContain('Dentristry');
    root.unmount();
  });

  it('renders the explainability sentence from the stored band/count under each field', async () => {
    const { container, root } = await mount(
      React.createElement(ResultList, { entries, total: 207 })
    );
    const text = container.textContent;
    // Unsuppressed: the band ('10-19', displayed with an en dash), never
    // an exact number.
    expect(text).toContain(`10–19 ${en.results.explainOf} 207 ${en.results.explainTail}`);
    // Suppressed: the exact count is still safe and still shown.
    expect(text).toContain(`9 ${en.results.explainOf} 207 ${en.results.explainTail}`);
    root.unmount();
  });

  it('keeps the ConfidenceBadge low-sample sentence verbatim and the suppression sentence together', async () => {
    const { container, root } = await mount(
      React.createElement(ResultList, { entries, total: 207 })
    );
    const suppressedCard = container.querySelector(
      '[data-field="Creative Art (Fashion Design, Interior Design etc)"]'
    );
    expect(suppressedCard.textContent).toContain(
      'Only 9 students in our data chose this — treat it as a lead, not a recommendation.'
    );
    expect(suppressedCard.textContent).toContain(
      'not enough to report satisfaction without risking identifying someone.'
    );
    // No satisfaction stat, no route, no placeholder on the suppressed card.
    expect(suppressedCard.textContent).not.toContain(en.results.statSatisfaction);
    expect(suppressedCard.textContent).not.toContain(en.results.statPreu);
    expect(suppressedCard.textContent).not.toContain('N/A');
    root.unmount();
  });
});

describe('MarginalisedNotice', () => {
  const answers = { stream: ['Arts'], personality: 'Introvert', speaking: 3 };

  it('renders the exact notice and the five pre-U routes', async () => {
    const { container, root } = await mount(
      React.createElement(MarginalisedNotice, { answers })
    );
    expect(container.textContent).toContain(
      'You haven’t picked a pre-U route yet, so this is averaged across all five. Tell us your route to sharpen it.'
    );
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual([
      'A-Levels',
      'Diploma',
      'Foundation',
      'Matriculation',
      'STPM',
    ]);
    root.unmount();
  });

  it('one click re-runs with the stored answers plus the chosen raw route, then navigates', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const { container, root } = await mount(
      React.createElement(MarginalisedNotice, { answers })
    );
    const stpm = [...container.querySelectorAll('button')].find(
      (b) => b.textContent === 'STPM'
    );
    await act(async () => {
      stpm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/quiz');
    expect(JSON.parse(init.body)).toEqual({
      answers: { ...answers, preu: 'STPM' },
    });
    expect(pushSpy).toHaveBeenCalledWith(
      '/results/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    );
    root.unmount();
  });

  it('a failed re-run shows calm copy and leaves the page usable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502 })));

    const { container, root } = await mount(
      React.createElement(MarginalisedNotice, { answers })
    );
    const btn = container.querySelector('button');
    await act(async () => {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[role="alert"]').textContent).toBe(
      en.results.marginalised.error
    );
    expect(pushSpy).not.toHaveBeenCalled();
    // Buttons are re-enabled for another try.
    expect(container.querySelector('button').disabled).toBe(false);
    root.unmount();
  });

  it('without readable answers, explains but offers no re-run buttons', async () => {
    const { container, root } = await mount(
      React.createElement(MarginalisedNotice, { answers: null })
    );
    expect(container.textContent).toContain('averaged across all five');
    expect(container.querySelectorAll('button').length).toBe(0);
    root.unmount();
  });
});
