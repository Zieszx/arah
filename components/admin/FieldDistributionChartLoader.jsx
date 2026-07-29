'use client';

// Thin client boundary whose only job is the dynamic, `ssr: false` import
// of FieldDistributionChart.jsx — `ssr: false` is only valid inside a
// Client Component (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md),
// so this one-line wrapper is what lets app/(admin)/admin/page.jsx stay a
// Server Component while keeping Recharts out of both the server bundle
// and /admin's initial client JS. Verified by build output: see the
// verification report for the confirmed absence from the first-load JS.
//
// The loading fallback is a static, non-empty skeleton at the chart's
// final height — never a blank box — so there is no layout shift.
import dynamic from 'next/dynamic';
import en from '@/lib/i18n/en';

const FieldDistributionChart = dynamic(() => import('./FieldDistributionChart.jsx'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label={en.admin.overview.chart.loading}
      className="h-[360px] w-full animate-pulse rounded-lg bg-surface-2"
    />
  ),
});

export default function FieldDistributionChartLoader({ data }) {
  return <FieldDistributionChart data={data} />;
}
