// "The finding" — the strongest single result in the 207-response survey,
// stated plainly (docs/PROJECT-RECORD.md §4, finding 2). A Server
// Component: every figure here is static text baked at build time, so the
// only client-side cost this section adds is the chart itself, loaded
// through FindingChartLoader.jsx (see that file for why Recharts is kept
// out of the initial bundle).
//
// The two satisfaction numbers and their dissatisfaction rates are stated
// twice — once as plain numerals here, once as bars in the chart — so the
// point survives even if the chart chunk hasn't finished loading yet on a
// slow connection.
import Kicker from '@/components/arah/Kicker.jsx';
import FindingChartLoader from './FindingChartLoader.jsx';
import en from '@/lib/i18n/en';

function StatBlock({ dotClassName, value, label, dissatisfied }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex items-center gap-2 text-[13px] font-medium text-text/90">
        <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${dotClassName}`} />
        {label}
      </span>
      <span className="font-mono text-[36px] leading-none text-text md:text-[42px]">
        {value}
        <span className="text-[16px] text-muted-foreground"> / 5</span>
      </span>
      <span className="font-mono text-[13px] text-muted-foreground">{dissatisfied}</span>
    </div>
  );
}

export default function Finding() {
  const t = en.landing.finding;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-14 md:px-16 md:py-24">
      <Kicker>{t.kicker}</Kicker>
      <h2 className="font-display mt-4 max-w-[20ch] text-[30px] leading-[1.15] md:text-[48px]">
        {t.title}
      </h2>
      <p className="mt-5 max-w-[64ch] text-[15px] leading-[1.6] text-muted-foreground md:text-base">
        {t.body}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:items-end md:gap-14">
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-6 sm:gap-10">
            <StatBlock
              dotClassName="bg-chart-1"
              value="4.38"
              label={t.passionLabel}
              dissatisfied={`5% ${t.dissatisfiedLead}`}
            />
            <StatBlock
              dotClassName="bg-chart-2"
              value="2.66"
              label={t.familyLabel}
              dissatisfied={`57% ${t.dissatisfiedLead}`}
            />
          </div>

          <div className="border-t border-hairline pt-8">
            {/* "11x" is a numeral readout (design system §4: numerals and
                readouts use the monospace face, never the display serif) —
                Instrument Serif's old-style "1" reads as a lowercase "l" at
                this size, which would make the single strongest number on
                the page illegible. */}
            <p className="flex flex-wrap items-baseline gap-x-3 leading-none">
              <span className="font-mono text-[40px] font-semibold text-violet-lt md:text-[52px]">
                {t.lessRegretLead}
              </span>
              <span className="font-display text-[28px] text-text md:text-[36px]">
                {t.lessRegretTail}
              </span>
            </p>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-muted-foreground">
              {t.lessRegretBody}
            </p>
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto">
          <FindingChartLoader />
          <p className="mt-3 text-xs text-muted-foreground">{t.chartCaption}</p>
        </div>
      </div>
    </section>
  );
}
