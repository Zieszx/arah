'use client';

// The satisfaction-distribution bar chart on /explore/[field] — isolated in
// its own module, exactly like components/landing/FindingChart.jsx, so
// Recharts is never pulled into this route's initial client bundle.
// SatisfactionChartLoader.jsx dynamically imports this file with
// `ssr: false`; it only downloads once mounted in the browser.
//
// One bar per satisfaction level 1-5, coloured with `--chart-1..5` in
// order (the full five-colour ramp, not just the cool/warm doublet
// FindingChart uses for its two-series comparison).
//
// A level with zero respondents is a genuine, real zero — the distribution
// object only contains keys for satisfaction values that were actually
// recorded, so a missing key here means "no one" (see
// components/results/AlumniContext.jsx's rule: a stored 0 must render as
// 0, never omitted as if it were withheld). That is different in kind from
// suppression, where the whole distribution is null; this component is
// never handed a null distribution — the caller (app/explore/[field]/page.jsx)
// only renders it for unsuppressed fields.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import en from '@/lib/i18n/en';

const LEVELS = [1, 2, 3, 4, 5];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-text shadow-lg">
      <p className="font-medium">
        {point.level} / 5
      </p>
      <p className="mt-1 font-mono text-muted-foreground">
        {point.count} {en.explore.detail.satisfactionAxisLabel}
      </p>
    </div>
  );
}

export default function SatisfactionChart({ distribution }) {
  const data = LEVELS.map((level) => ({
    level: String(level),
    count: Number(distribution?.[level]) || 0,
    fill: `var(--chart-${level})`,
  }));

  return (
    <div className="h-[240px] w-full min-w-0 md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 24, right: 8, bottom: 8, left: -16 }}
          barCategoryGap="30%"
        >
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="level"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--hairline)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
            {data.map((entry) => (
              <Cell key={entry.level} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="count"
              position="top"
              fill="var(--color-text)"
              fontSize={13}
              fontFamily="var(--font-body)"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
