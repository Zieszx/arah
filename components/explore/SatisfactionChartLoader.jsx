'use client';

// Thin client boundary whose only job is the dynamic, `ssr: false` import
// of SatisfactionChart.jsx — same pattern and same reason as
// components/landing/FindingChartLoader.jsx: `ssr: false` is only valid
// inside a Client Component, so this one-line wrapper is what lets
// app/explore/[field]/page.jsx stay a Server Component while keeping
// Recharts out of both the server bundle and this route's initial client
// JS. The chunk is fetched only once this component mounts in the browser.
//
// The loading fallback is a static, non-empty skeleton at the chart's
// final height — never a blank box — so there is no layout shift.
import dynamic from 'next/dynamic';

const SatisfactionChart = dynamic(() => import('./SatisfactionChart.jsx'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="h-[240px] w-full animate-pulse rounded-lg bg-surface-2 md:h-[280px]"
    />
  ),
});

export default function SatisfactionChartLoader({ distribution }) {
  return <SatisfactionChart distribution={distribution} />;
}
