'use client';

// One question's distribution, Google-Forms style. Isolated in its own module
// for the same reason FieldDistributionChart.jsx is: the loader dynamically
// imports this with `ssr: false`, so Recharts is fetched as its own chunk when
// the charts page mounts rather than inlined into every admin route's JS.
//
// Chart form follows the question, not preference:
//   - a linear scale (1-5) is a column chart, left to right in scale order,
//     because the x-axis is genuinely ordinal;
//   - everything else is a horizontal bar chart, because the categories are
//     long Malaysian option strings ("Technical & Vocational (Sains Komputer,
//     Rekacipta, Lukisan Kejuruteraan etc)") that are unreadable rotated
//     under a column.
//
// No pie charts. Multi-select questions let one respondent tick three boxes,
// so the parts do not sum to a whole and a pie would state something false.
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
import { useEffect, useState } from 'react';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

function pickYAxisWidth(viewportWidth) {
  if (viewportWidth < 400) return 104;
  if (viewportWidth < 640) return 140;
  if (viewportWidth < 1024) return 190;
  return 260;
}

// Only ever mounted client-side (next/dynamic with ssr: false), so reading
// window in the initial state cannot mismatch a server render.
function useYAxisWidth() {
  const [width, setWidth] = useState(() => pickYAxisWidth(window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(pickYAxisWidth(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

const axisStyle = {
  fontSize: 12,
  fill: 'var(--color-muted-foreground)',
  fontFamily: 'var(--font-body)',
};

function ChartTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const { label, value } = payload[0].payload;
  const share = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="max-w-[280px] rounded-lg border border-hairline bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-mono tabular-nums text-ink">{value}</span>{' '}
        {value === 1 ? 'response' : 'responses'} · {share}%
      </p>
    </div>
  );
}

export default function QuestionChart({ entries, type, respondents }) {
  const yAxisWidth = useYAxisWidth();
  const scale = type === 'num';

  // Height grows with the number of bars so a 11-option question does not
  // squeeze its bars to a few pixels inside a fixed box.
  const height = scale ? 220 : Math.max(160, entries.length * 38 + 40);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={entries}
          layout={scale ? 'horizontal' : 'vertical'}
          margin={
            scale
              ? { top: 24, right: 12, bottom: 4, left: 4 }
              : { top: 4, right: 44, bottom: 4, left: 4 }
          }
        >
          {scale ? (
            <>
              <XAxis
                dataKey="label"
                tick={axisStyle}
                axisLine={{ stroke: 'var(--hairline)' }}
                tickLine={false}
              />
              <YAxis hide />
            </>
          ) : (
            <>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={yAxisWidth}
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
            </>
          )}
          <Tooltip
            content={<ChartTooltip total={respondents} />}
            cursor={{ fill: 'var(--color-surface-2)' }}
          />
          <Bar dataKey="value" radius={scale ? [6, 6, 0, 0] : [0, 6, 6, 0]} maxBarSize={30}>
            {entries.map((entry, i) => (
              <Cell key={entry.label} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
            <LabelList
              dataKey="value"
              position={scale ? 'top' : 'right'}
              style={{
                fontSize: 12,
                fill: 'var(--color-ink)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
