import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';

const t = en.admin.overview.model;
const proof = en.landing.proof;

/**
 * The model card (Task 2). The brief's non-negotiable: BOTH top-3
 * accuracy figures at equal visual weight, so a demo can't quote only the
 * flattering one. Implemented literally — `withRoute` and `withoutRoute`
 * are the same size, same weight, same card, side by side; nothing here
 * makes 69.1% bigger, bolder or first-and-therefore-primary. The baseline
 * sits in its own, visually quieter cell so it reads as context, not a
 * third result competing with the two real ones.
 *
 * Figures are pulled from `en.landing.proof` — the exact same strings the
 * public landing page states — rather than re-typed here, so there is
 * exactly one place these numbers could ever drift.
 */
export default function ModelAccuracyCard({ modelVersion, n }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6 md:p-8">
      <Kicker className="text-violet-ink">{t.kicker}</Kicker>
      <h2 className="font-display mt-2 text-2xl text-ink md:text-[28px]">{t.title}</h2>
      <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
        {t.body}
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: t.withRoute, value: proof.withRoute.value },
          { label: t.withoutRoute, value: proof.withoutRoute.value },
        ].map((figure) => (
          <div
            key={figure.label}
            className="rounded-xl border border-violet/25 bg-violet-soft/40 p-5"
          >
            <dt className="text-sm font-medium leading-snug text-ink">{figure.label}</dt>
            <dd className="mt-2 font-mono text-4xl font-semibold tabular-nums text-violet-ink">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-hairline pt-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.baseline}
          </p>
          <p className="mt-1 font-mono text-lg text-ink">{proof.baseline.value}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.version}</p>
          <p className="mt-1 font-mono text-lg text-ink">{modelVersion ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.n}</p>
          <p className="mt-1 font-mono text-lg text-ink">
            {typeof n === 'number' ? n.toLocaleString('en-US') : '—'}
          </p>
        </div>
      </div>
    </section>
  );
}
