'use client';

// Thin client boundary whose only job is the dynamic, `ssr: false` import
// of FindingChart.jsx. next/dynamic's `ssr: false` option is only valid
// inside a Client Component (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md
// — "ssr: false is not allowed with next/dynamic in Server Components"),
// so this one-line wrapper is what lets Finding.jsx itself stay a Server
// Component while still keeping Recharts out of both the server bundle and
// the page's initial client JS: the ~heavy Recharts chunk is fetched only
// once this component mounts in the browser, as its own separate request,
// never blocking first paint or inflating the landing page's first-load JS.
//
// The loading fallback is a static, non-empty skeleton bar at the chart's
// final height — never a blank box — so there is no layout shift and
// nothing that could read as broken while the chunk downloads on a slow
// connection.
import dynamic from 'next/dynamic';

const FindingChart = dynamic(() => import('./FindingChart.jsx'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="h-[260px] w-full animate-pulse rounded-lg bg-surface-2 md:h-[300px]"
    />
  ),
});

export default function FindingChartLoader() {
  return <FindingChart />;
}
