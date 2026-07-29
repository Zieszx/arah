'use client';

// The one Recharts chart on the landing page — deliberately isolated in
// its own module so the library is never pulled into the initial client
// bundle. FindingChartLoader.jsx dynamically imports this file with
// `ssr: false`, so Recharts only downloads once this component actually
// mounts in the browser, as its own separate chunk.
//
// Colours are the two `--chart-1`/`--chart-2` CSS custom properties
// directly (the colour-blind-safe cool/warm doublet, app/globals.css) —
// passed straight through as `var(--chart-1)` / `var(--chart-2)` fill
// values. Per the QA note in app/globals.css, `--chart-1`/`--chart-2`
// themselves are always readable at runtime in every build; it is only the
// unused `--color-chart-N` alias that is sometimes optimised away, and
// this component never touches that alias.
//
// The bars are a purely supplementary visual: the exact figures (4.38/5,
// 2.66/5, 5% vs 57% dissatisfied, "11x less regret") are stated in plain
// text in Finding.jsx regardless of whether this chart has loaded, so
// nothing here is the sole carrier of the data.
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

const t = en.landing.finding;

const DATA = [
  { label: t.passionLabel, value: 4.38, dissatisfied: 5, fill: 'var(--chart-1)' },
  { label: t.familyLabel, value: 2.66, dissatisfied: 57, fill: 'var(--chart-2)' },
];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-text shadow-lg">
      <p className="font-medium">{point.label}</p>
      <p className="mt-1 font-mono text-muted-foreground">
        {point.value.toFixed(2)} / 5 · {point.dissatisfied}% {t.dissatisfiedLead}
      </p>
    </div>
  );
}

export default function FindingChart() {
  return (
    <div className="h-[260px] w-full min-w-0 md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={DATA}
          margin={{ top: 24, right: 8, bottom: 8, left: -16 }}
          barCategoryGap="35%"
        >
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--hairline)' }}
          />
          <YAxis
            domain={[0, 5]}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={96}>
            {DATA.map((entry) => (
              <Cell key={entry.label} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v) => v.toFixed(2)}
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
