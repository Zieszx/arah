'use client';

// The Recharts half of the field-distribution bar (Task 2) — isolated in
// its own module for the same reason components/landing/FindingChart.jsx
// is: FieldDistributionChartLoader.jsx dynamically imports this file with
// `ssr: false`, so Recharts is fetched as its own chunk only once this
// component actually mounts in the browser, never inlined into /admin's
// initial client JS.
//
// Colours cycle through --chart-1..5 (app/globals.css) — the same five
// tokens the rest of the product uses for any multi-series chart, so a
// ten-field bar reuses the doublet twice rather than inventing a sixth
// hue. Exact counts, not the public /explore pages' banded figures — see
// lib/admin/overview.js's header for why that's the correct choice here.
//
// The YAxis label column width is responsive (useYAxisWidth below) — at
// a fixed 220px it ate almost the entire chart at 320px (caught by
// screenshot: the bars themselves were reduced to a handful of visible
// pixels). Recharts' own tick renderer already wraps a label onto
// multiple lines to fit whatever `width` it's given, so shrinking the
// column on narrow viewports is enough; the wrapping keeps working.
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function pickYAxisWidth(viewportWidth) {
  if (viewportWidth < 400) return 108;
  if (viewportWidth < 640) return 150;
  if (viewportWidth < 1024) return 180;
  return 220;
}

// This component is only ever mounted client-side (loaded via
// next/dynamic with `ssr: false` in FieldDistributionChartLoader.jsx), so
// reading `window` in the initial state is safe — there is no server
// render of this component to mismatch against.
function useYAxisWidth() {
  const [width, setWidth] = useState(() => pickYAxisWidth(window.innerWidth));
  useEffect(() => {
    function onResize() {
      setWidth(pickYAxisWidth(window.innerWidth));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-ink shadow-lg">
      <p className="font-medium">{point.field}</p>
      <p className="mt-1 font-mono text-muted-foreground">{point.count} alumni</p>
    </div>
  );
}

export default function FieldDistributionChart({ data }) {
  // Hook runs unconditionally before any conditional rendering below —
  // this component has no early return, but keeping the hook first is
  // the project's hook-order convention regardless.
  const yAxisWidth = useYAxisWidth();

  return (
    <div className="h-[360px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 32, bottom: 8, left: 8 }}
          barCategoryGap="28%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="field"
            width={yAxisWidth}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--hairline)' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry, index) => (
              <Cell key={entry.field} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              fill="var(--color-ink)"
              fontSize={12}
              fontFamily="var(--font-body)"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
