// @vitest-environment jsdom
//
// /explore's honesty requirements, mirroring tests/js/results-components.test.js:
//  - a suppressed field states its sample size and WHY the statistics are
//    withheld — never 0, "—", "N/A" or an imputed value;
//  - every field name renders through displayLabel (the survey typo must
//    never reach a student);
//  - CommonRoutes renders only entries actually present, sorted by count,
//    and nothing at all for a null/empty distribution;
//  - AdviceQuotes renders nothing when handed no quotes, and always carries
//    the generic "From students who took this path" attribution — never a
//    per-field claim, since the underlying data has no field attached.
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }) =>
    React.createElement('a', { href, ...props }, children),
}));

const { default: FieldCard } = await import('@/components/explore/FieldCard.jsx');
const { default: CommonRoutes } = await import('@/components/explore/CommonRoutes.jsx');
const { default: AdviceQuotes } = await import('@/components/explore/AdviceQuotes.jsx');
const en = (await import('@/lib/i18n/en.js')).default;

function mount(el) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(el);
  });
  return { container, root };
}

describe('FieldCard', () => {
  it('suppressed: states the sample size and why, never a fabricated stat', async () => {
    const { container, root } = mount(
      React.createElement(FieldCard, {
        raw: 'Creative Art (Fashion Design, Interior Design etc)',
        slug: 'creative-art',
        sampleSize: 9,
        avgSatisfaction: null,
        commonPreu: null,
        suppressed: true,
      })
    );
    expect(container.textContent).toContain(
      'Only 9 students in our data chose this — not enough to report satisfaction without risking identifying someone.'
    );
    expect(container.textContent).not.toContain(en.explore.statSatisfaction);
    expect(container.textContent).not.toContain('N/A');
    expect(container.textContent).not.toContain('undefined');
    root.unmount();
  });

  it('unsuppressed: renders name through displayLabel — the survey typo never reaches a student', async () => {
    const { container, root } = mount(
      React.createElement(FieldCard, {
        raw: 'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)',
        slug: 'health-medical-sciences',
        sampleSizeBand: '10-19',
        avgSatisfaction: 3.37,
        commonPreu: 'Matriculation',
        suppressed: false,
      })
    );
    expect(container.textContent).toContain('Dentistry');
    expect(container.textContent).not.toContain('Dentristry');
    expect(container.textContent).toContain('3.37');
    expect(container.textContent).toContain('Matriculation');
    root.unmount();
  });

  it('unsuppressed: shows the banded sample size, never an exact count (0009 hardening)', async () => {
    const { container, root } = mount(
      React.createElement(FieldCard, {
        raw: 'Health & Medical Sciences (Medicine, Pharmacy, Dentristry etc)',
        slug: 'health-medical-sciences',
        sampleSizeBand: '10-19',
        avgSatisfaction: 3.37,
        commonPreu: 'Matriculation',
        suppressed: false,
      })
    );
    expect(container.textContent).toContain('10–19');
    expect(container.textContent).not.toContain('19 students');
    root.unmount();
  });

  it('links to /explore/<slug>', async () => {
    const { container, root } = mount(
      React.createElement(FieldCard, {
        raw: 'Law & Legal Studies',
        slug: 'law-legal-studies',
        sampleSizeBand: '10-19',
        avgSatisfaction: 3.56,
        commonPreu: 'Diploma',
        suppressed: false,
      })
    );
    expect(container.querySelector('a').getAttribute('href')).toBe(
      '/explore/law-legal-studies'
    );
    root.unmount();
  });
});

describe('CommonRoutes', () => {
  // Fixture shaped like a real field_detail_stats row post-0010 hardening:
  // rounded percentages (nearest 5, 5 floor for any present category),
  // never exact headcounts — see 0010_field_detail_stats_hardening.sql.
  it('renders entries sorted by share, descending, as rounded percentages — never a bare count', async () => {
    const { container, root } = mount(
      React.createElement(CommonRoutes, {
        kicker: 'pre-university routes',
        distribution: { Diploma: 30, 'A-Levels': 25, Foundation: 40, Matriculation: 5 },
      })
    );
    const labels = [...container.querySelectorAll('li > div > span:first-child')].map(
      (n) => n.textContent
    );
    expect(labels).toEqual(['Foundation', 'Diploma', 'A-Levels', 'Matriculation']);
    // Every displayed figure carries a % sign — never a lone integer that
    // could be mistaken for a headcount.
    const values = [...container.querySelectorAll('li > div > span:last-child')].map(
      (n) => n.textContent
    );
    expect(values).toEqual(['~40%', '~30%', '~25%', '~5%']);
    root.unmount();
  });

  it('renders nothing for a null distribution (suppressed field) — no invented rows', async () => {
    const { container, root } = mount(
      React.createElement(CommonRoutes, { kicker: 'x', distribution: null })
    );
    expect(container.innerHTML).toBe('');
    root.unmount();
  });

  it('renders nothing for an empty distribution', async () => {
    const { container, root } = mount(
      React.createElement(CommonRoutes, { kicker: 'x', distribution: {} })
    );
    expect(container.innerHTML).toBe('');
    root.unmount();
  });
});

describe('AdviceQuotes', () => {
  it('renders every quote plus the generic, non-per-field attribution', async () => {
    const { container, root } = mount(
      React.createElement(AdviceQuotes, {
        quotes: ['Choose wisely.', 'Take your time.'],
      })
    );
    expect(container.textContent).toContain('Choose wisely.');
    expect(container.textContent).toContain('Take your time.');
    expect(container.textContent).toContain(en.explore.detail.quotesAttribution);
    root.unmount();
  });

  it('renders nothing for an empty or missing quote list — the suppressed-field case', async () => {
    const empty = mount(React.createElement(AdviceQuotes, { quotes: [] }));
    expect(empty.container.innerHTML).toBe('');
    empty.root.unmount();

    const missing = mount(React.createElement(AdviceQuotes, { quotes: undefined }));
    expect(missing.container.innerHTML).toBe('');
    missing.root.unmount();
  });
});
