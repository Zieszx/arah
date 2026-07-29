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
// Values are PERCENTAGES, not counts (0010_field_detail_stats_hardening.sql):
// the view used to publish an exact per-level headcount, which polling
// before/after one contribution's approval could read as that specific
// respondent's exact satisfaction score — no arithmetic needed, unlike
// field_stats' subtler sum-based leak. Every value here is now rounded to
// the nearest 5(%), with a 5% floor for any level that has at least one
// respondent — a level someone genuinely chose must never render as 0%,
// which would read as "no one" (components/results/AlumniContext.jsx's
// rule about a stored 0 vs an omitted key applies to the source data, not
// to this chart, which never sees an exact 0 vs "absent" distinction any
// more; a level simply absent from the object had no respondents).
//
// A level absent from the distribution object had no respondents at that
// level; this component is never handed a null distribution at all — the
// caller (app/explore/[field]/page.jsx) only renders it for unsuppressed
// fields.
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
        ~{point.pct}% {en.explore.detail.satisfactionAxisLabel}
      </p>
    </div>
  );
}

export default function SatisfactionChart({ distribution }) {
  const data = LEVELS.map((level) => ({
    level: String(level),
    pct: Number(distribution?.[level]) || 0,
    fill: `var(--chart-${level})`,
  }));

  return (
    <div className="h-[240px] w-full min-w-0 md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          // left margin was -16 when the Y axis only ever showed a bare
          // count ("0".."20", 1-2 characters). Percentage ticks ("100%")
          // are wider and were clipping down to a lone "%" with that same
          // negative margin — widened here and the axis width below to
          // fit "100%" in full.
          margin={{ top: 24, right: 8, bottom: 8, left: 0 }}
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
            domain={[0, 100]}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
          <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={72}>
            {data.map((entry) => (
              <Cell key={entry.level} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="pct"
              position="top"
              // Never render a bare number here — every value on this
              // chart is a rounded percentage (0010 hardening), and a
              // bare "40" reads as a headcount, exactly the precision this
              // migration removed.
              formatter={(v) => `~${v}%`}
              fill="var(--color-text)"
              fontSize={13}
              fontFamily="var(--font-mono)"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
