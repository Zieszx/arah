// "Proof" — both accuracy figures, always shown together, at identical
// visual weight. This is the one section on the page with an explicit
// honesty constraint from the brief: never show only the higher number,
// because a single figure invites whoever demos this to quote the
// flattering one. The two real accuracy cards below share the exact same
// font size, card style and column width — neither is bigger, bolder or
// positioned first-among-equals — and the naive baseline sits alongside
// them, styled a step quieter, as the floor they are being measured
// against rather than a third result.
//
// A Server Component: static copy and static numbers, no interactivity.
import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';
import { cn } from '@/lib/utils';

function ProofCard({ label, value, muted }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-hairline p-6 md:p-8',
        muted ? 'bg-surface/40' : 'bg-surface'
      )}
    >
      <span
        className={cn(
          'font-mono text-[40px] leading-none md:text-[48px]',
          muted ? 'text-text/70' : 'text-text'
        )}
      >
        {value}
      </span>
      <span className="max-w-[30ch] text-[14px] leading-[1.5] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function Proof() {
  const t = en.landing.proof;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 py-14 md:px-16 md:py-24">
      <Kicker>{t.kicker}</Kicker>
      <h2 className="font-display mt-4 max-w-[24ch] text-[30px] leading-[1.15] md:text-[48px]">
        {t.title}
      </h2>
      <p className="mt-5 max-w-[64ch] text-[15px] leading-[1.6] text-muted-foreground md:text-base">
        {t.body}
      </p>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3 md:mt-14">
        <ProofCard label={t.withRoute.label} value={t.withRoute.value} />
        <ProofCard label={t.withoutRoute.label} value={t.withoutRoute.value} />
        <ProofCard label={t.baseline.label} value={t.baseline.value} muted />
      </div>

      <p className="mt-6 font-mono text-xs text-muted-foreground">{t.n}</p>
    </section>
  );
}
