// A labelled bar-list for a field's pre-U route breakdown or SPM stream
// breakdown on /explore/[field]. Reused for both (app/explore/[field]/page.jsx
// renders it twice, once per distribution) rather than duplicating the same
// "sorted rows with a proportional bar" markup for two datasets that only
// differ in copy and the source object.
//
// Pure presentational component: no hooks, no client state, server-safe —
// same shape as components/results/AlumniContext.jsx. Every count rendered
// here comes straight from field_detail_stats (0008 migration), which is
// null for suppressed fields; the caller only ever passes a real
// distribution object for unsuppressed fields, so this component never has
// to make its own suppression decision.
import { displayLabel } from '@/lib/i18n/labels';

export default function CommonRoutes({ kicker, intro, distribution, className }) {
  const entries = Object.entries(distribution ?? {})
    .map(([label, count]) => ({ label, count: Number(count) || 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count);

  if (entries.length === 0) return null;

  const max = Math.max(...entries.map((e) => e.count));

  return (
    <section className={className}>
      {kicker ? (
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-lt">
          {kicker}
        </h3>
      ) : null}
      {intro ? (
        <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-muted-foreground">
          {intro}
        </p>
      ) : null}
      <ul className="mt-5 flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={entry.label}>
            {/* Label sits above its bar (MatchBar's own layout), not beside
                it in a fixed-width column — several stream/route names run
                well past what a side-by-side column can hold without
                truncating mid-word, and a truncated option name is exactly
                the kind of "looks like missing data" the honesty rules on
                this page exist to avoid. */}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] text-text">{displayLabel(entry.label)}</span>
              <span className="shrink-0 font-mono text-[13px] text-muted-foreground">
                {entry.count}
              </span>
            </div>
            <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-ink">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max((entry.count / max) * 100, 4)}%`,
                  backgroundImage:
                    'linear-gradient(90deg, var(--color-violet), var(--color-violet-lt))',
                }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
