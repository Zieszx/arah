import Link from 'next/link';
import FlowButton from '@/components/arah/FlowButton.jsx';
import Kicker from '@/components/arah/Kicker.jsx';
import MatchBar from '@/components/arah/MatchBar.jsx';
import ConfidenceBadge from '@/components/arah/ConfidenceBadge.jsx';
import { Card } from '@/components/ui/card.jsx';

export const metadata = {
  title: 'ARAH — Design system demo',
  description: 'Live reference for the ARAH visual system: type, colour, components and motion.',
};

const TYPE_SCALE = [
  {
    label: 'Display · 64 / 42',
    sample: 'Aa — find your fit',
    className: 'font-display text-[42px] leading-[1.08] md:text-[64px]',
  },
  {
    label: 'H1 · 42 / 30',
    sample: 'Aa — find your fit',
    className: 'font-display text-[30px] leading-[1.1] md:text-[42px]',
  },
  {
    label: 'H2 · 30 / 24',
    sample: 'Aa — find your fit',
    className: 'font-display text-[24px] leading-[1.1] md:text-[30px]',
  },
  {
    label: 'H3 · 21 / 18',
    sample: 'Aa — find your fit',
    className: 'font-display text-[18px] leading-[1.15] md:text-[21px]',
  },
  {
    label: 'Body · 16 / 15',
    sample: 'Aa — find your fit',
    className: 'font-body text-[15px] leading-[1.5] md:text-[16px]',
  },
  {
    label: 'Small · 13 / 12',
    sample: 'Aa — find your fit',
    className: 'font-body text-[12px] leading-[1.5] md:text-[13px]',
  },
];

// Light-theme conversion, 2026-07-29 (docs/design/light-theme-conversion.md):
// hex values here are for display only — the swatch itself always renders
// the live token via `className`, so these labels exist purely so a
// visitor can read off the current value without opening devtools. Keep
// them in sync with app/globals.css's @theme block by hand; nothing
// enforces that automatically.
const PALETTE = [
  { name: 'paper', hex: '#FBFAFC', className: 'bg-paper' },
  { name: 'surface', hex: '#FFFFFF', className: 'bg-surface' },
  { name: 'surface-2', hex: '#F3F2F7', className: 'bg-surface-2' },
  { name: 'ink (text)', hex: '#12101D', className: 'bg-ink' },
  { name: 'violet', hex: '#6D28D9', className: 'bg-violet' },
  { name: 'violet-lt (violet-ink)', hex: '#5B21B6', className: 'bg-violet-lt' },
  { name: 'violet-pl', hex: '#4C1D95', className: 'bg-violet-pl' },
  { name: 'cyan (teal)', hex: '#0E7490', className: 'bg-cyan' },
];

const CHART_COLORS = [
  { name: 'chart-1', hex: '#0E7490', className: 'bg-chart-1' },
  { name: 'chart-2', hex: '#92400E', className: 'bg-chart-2' },
  { name: 'chart-3', hex: '#5B21B6', className: 'bg-chart-3' },
  { name: 'chart-4', hex: '#4C1D95', className: 'bg-chart-4' },
  { name: 'chart-5', hex: '#6D28D9', className: 'bg-chart-5' },
];

const RESULTS = [
  { label: 'Software Engineering', percent: 75, tone: 'cyan', sampleSize: 44 },
  { label: 'Actuarial Science', percent: 22, tone: 'violet', sampleSize: 16 },
  { label: 'Fine Arts', percent: 3, tone: 'amber', sampleSize: 9 },
];

function SectionKicker({ index, children }) {
  return <Kicker>{`0${index} — ${children}`}</Kicker>;
}

function Swatch({ name, hex, className }) {
  return (
    <div className="flex flex-col gap-3">
      <div className={`h-20 w-full rounded-lg border ${className}`} />
      <div className="font-mono text-xs leading-tight">
        <div className="text-text/90">{name}</div>
        <div className="text-muted-foreground">{hex}</div>
      </div>
    </div>
  );
}

function StateSample({ label, children }) {
  return (
    <div className="flex flex-col items-start gap-3">
      {children}
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function DemoPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ------------------------------------------------------------ */}
      {/* 1. Hero                                                       */}
      {/* ------------------------------------------------------------ */}
      <section className="mx-auto flex min-h-[88vh] w-full max-w-[1280px] flex-col justify-center px-6 py-24 md:px-16">
        <div
          className="font-display text-lg uppercase text-text/90 md:text-xl"
          style={{ letterSpacing: '0.20em' }}
        >
          ARAH
        </div>

        <Kicker className="mt-8">207 students before you</Kicker>

        <h1 className="font-display mt-6 max-w-[16ch] text-[42px] leading-[1.08] md:text-[64px]">
          Find the course that actually fits.
        </h1>

        <p className="mt-6 max-w-[34ch] text-[15px] text-muted-foreground md:max-w-[46ch] md:text-base">
          Matched against real outcomes from the students who took this quiz
          before you — not guesswork.
        </p>

        <FlowButton className="mt-10 w-fit">Start the quiz</FlowButton>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 2. Typography specimen                                        */}
      {/* ------------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-14 md:px-16 md:py-24">
        <SectionKicker index={2}>type</SectionKicker>
        <h2 className="font-display mt-3 text-[24px] md:text-[30px]">Typography</h2>
        <p className="mt-3 max-w-[36ch] text-[15px] text-muted-foreground">
          Instrument Serif carries every headline. Inter carries everything
          else.
        </p>

        <div className="mt-10 flex flex-col border-t border-hairline md:mt-14">
          {TYPE_SCALE.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 border-b border-hairline py-6 md:flex-row md:items-baseline md:justify-between md:gap-4"
            >
              <span className={row.className}>{row.sample}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {row.label}
              </span>
            </div>
          ))}
          <div className="flex flex-col gap-3 py-6 md:flex-row md:items-baseline md:justify-between md:gap-4">
            <Kicker>207 students before you</Kicker>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              Kicker · 10 / 9
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 3. Palette                                                    */}
      {/* ------------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-14 md:px-16 md:py-24">
        <SectionKicker index={3}>palette</SectionKicker>
        <h2 className="font-display mt-3 text-[24px] md:text-[30px]">Colour</h2>
        <p className="mt-3 max-w-[36ch] text-[15px] text-muted-foreground">
          Violet leads. Cyan supports. Never equal weight on one screen.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 md:mt-14">
          {PALETTE.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>

        <div className="mt-14 border-t border-hairline pt-10 md:mt-16">
          <span className="font-mono text-xs text-muted-foreground">
            Chart series (5)
          </span>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-5">
            {CHART_COLORS.map((c) => (
              <Swatch key={c.name} {...c} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 4. Components                                                 */}
      {/* ------------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-14 md:px-16 md:py-24">
        <SectionKicker index={4}>components</SectionKicker>
        <h2 className="font-display mt-3 text-[24px] md:text-[30px]">Components</h2>

        <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-8 md:mt-14">
          <StateSample label="default">
            <FlowButton data-demo="default">Start the quiz</FlowButton>
          </StateSample>
          <StateSample label="hover">
            <FlowButton data-demo="hover">Start the quiz</FlowButton>
          </StateSample>
          <StateSample label="focus">
            <FlowButton data-demo="focus">Start the quiz</FlowButton>
          </StateSample>
          <StateSample label="disabled">
            <FlowButton disabled data-demo="disabled">
              Start the quiz
            </FlowButton>
          </StateSample>
          <StateSample label="as link">
            <FlowButton href="/demo#components" data-demo="link">
              View results
            </FlowButton>
          </StateSample>
        </div>

        <div className="mt-14 border-t border-hairline pt-10 md:mt-16">
          <span className="font-mono text-xs text-muted-foreground">
            Match results — bar + confidence badge together
          </span>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {RESULTS.map((r) => (
              <Card key={r.label} className="bg-surface p-6">
                <MatchBar label={r.label} percent={r.percent} tone={r.tone} />
                <ConfidenceBadge sampleSize={r.sampleSize} className="mt-6" />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* 5. Motion note                                                */}
      {/* ------------------------------------------------------------ */}
      <section className="mx-auto w-full max-w-[1280px] px-6 py-14 md:px-16 md:py-24">
        <SectionKicker index={5}>motion</SectionKicker>
        <h2 className="font-display mt-3 max-w-[18ch] text-[24px] md:text-[30px]">
          What&apos;s running behind this page
        </h2>

        <ul className="mt-8 flex max-w-[42ch] flex-col gap-4 text-[15px] text-muted-foreground md:mt-10">
          <li>
            An interactive particle field — drifting violet dots, thinly
            linked by distance, that gently give way around the cursor.
          </li>
          <li>
            A 100px cursor spotlight — a soft violet tint that deepens the
            page as it tracks the pointer.
          </li>
          <li>
            A brushed-scatter sand cursor — grains that fly with the
            direction of travel, then decelerate, on the same canvas as
            the field.
          </li>
        </ul>

        <p className="mt-8 max-w-[42ch] text-[15px] text-text/90 md:mt-10">
          All three switch off under <code className="font-mono text-[13px]">prefers-reduced-motion</code>{' '}
          and on touch devices — no exceptions, no separate setting.
        </p>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-10 md:px-16">
          <span className="font-mono text-xs text-muted-foreground">
            ARAH — design system preview
          </span>
          <Link
            href="/"
            className="font-mono text-xs text-violet-lt underline-offset-4 hover:underline"
          >
            back home
          </Link>
        </div>
      </footer>
    </main>
  );
}
