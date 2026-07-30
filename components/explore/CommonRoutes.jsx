// A labelled bar-list for a field's pre-U route breakdown or SPM stream
// breakdown on /explore/[field]. Reused for both (app/explore/[field]/page.jsx
// renders it twice, once per distribution) rather than duplicating the same
// "sorted rows with a proportional bar" markup for two datasets that only
// differ in copy and the source object.
//
// Pure presentational component: no hooks, no client state, server-safe —
// same shape as components/results/AlumniContext.jsx. Every value rendered
// here comes straight from field_detail_stats (0008, hardened by
// 0010_field_detail_stats_hardening.sql), which is null for suppressed
// fields; the caller only ever passes a real distribution object for
// unsuppressed fields, so this component never has to make its own
// suppression decision.
//
// Values are rounded PERCENTAGES since 0010, not exact headcounts — the
// exact-count shape this component originally rendered was the leak that
// migration closed (an exact per-category count made an approved
// contribution's category directly readable by diffing two reads). The
// displayed "%" suffix is load-bearing, not decorative: showing a bare
// number here again would silently imply precision the data no longer
// has.
import { displayLabel } from '@/lib/i18n/labels';

export default function CommonRoutes({ kicker, intro, distribution, className }) {
  const entries = Object.entries(distribution ?? {})
    .map(([label, pct]) => ({ label, pct: Number(pct) || 0 }))
    .filter((e) => e.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  if (entries.length === 0) return null;

  const max = Math.max(...entries.map((e) => e.pct));

  return (
    <section className={className}>
      {kicker ? (
        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-lt">
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
                ~{entry.pct}%
              </span>
            </div>
            {/* Track on --surface-2, matching MatchBar's light-theme re-tune
                (light-theme-conversion.md §5) — --ink is body text now,
                not a background. */}
            <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max((entry.pct / max) * 100, 4)}%`,
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
