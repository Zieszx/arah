import { cn } from '@/lib/utils';

// Light-theme re-tune (light-theme-conversion.md §5): `high` used
// `border-white/10 bg-white/5` — a near-invisible lightening trick that
// only reads against a dark card. On paper that pair renders as an
// almost-transparent pill with no visible edge at all, so `high` now
// uses --hairline/--surface-2 for the same "neutral, doesn't compete
// with the accent tiers" pill the design system calls for (§6: "high
// neutral · medium amber · low amber"). `medium`/`low` keep the
// amber-tinted pattern; --color-amber itself was re-derived (see
// app/globals.css) since the old #FFB627 measured 1.8:1 on paper.
const TIER_STYLE = {
  high: 'border-hairline bg-surface-2 text-ink',
  medium: 'border-amber/30 bg-amber/10 text-amber',
  low: 'border-amber/30 bg-amber/10 text-amber',
};

const TIER_LABEL = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

/**
 * Sample-size tiers for a match result.
 *
 * Boundaries: >=20 high, 10-19 medium, <10 low. A missing or invalid
 * sample size falls to `low` rather than `high` — this is an honesty
 * feature about how much data actually backs a recommendation, so an
 * unknown sample size must never silently read as reassuring.
 */
export function getConfidenceTier(sampleSize) {
  const n = Number(sampleSize);
  if (Number.isFinite(n) && n >= 20) return 'high';
  if (Number.isFinite(n) && n >= 10) return 'medium';
  return 'low';
}

/**
 * Two fields in the real dataset have only 7 and 9 students behind
 * them. Below 10, the tier badge is not enough on its own — the exact
 * count is spelled out in a full sentence, visibly, every time. This
 * wording is deliberate and must not be softened: it exists so a
 * student never mistakes a thin sample for a real recommendation.
 *
 * `tier` is an optional precomputed override (field_stats hardening,
 * 0009_field_stats_hardening.sql, made the exact sample size for an
 * unsuppressed field unavailable to callers — only a band survives —
 * so a caller with a band already knows the tier and should pass it
 * directly rather than coercing a band string through
 * `getConfidenceTier`, which expects a number). When omitted, the tier
 * is derived from `sampleSize` exactly as before — every existing
 * caller (the /demo reference page, and this component's own tests)
 * keeps working unchanged. The low-tier sentence always uses
 * `sampleSize` directly; that path only ever fires for a suppressed
 * entry, where the exact count is safe to show (see the migration).
 */
export default function ConfidenceBadge({ sampleSize, tier: tierProp, className }) {
  const tier = tierProp ?? getConfidenceTier(sampleSize);

  return (
    <div className={cn('inline-flex flex-col items-start gap-1.5', className)}>
      <span
        data-tier={tier}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
          'text-xs font-medium uppercase tracking-wide',
          TIER_STYLE[tier]
        )}
      >
        {TIER_LABEL[tier]}
      </span>
      {tier === 'low' && (
        <p className="max-w-prose text-sm text-amber">
          Only {sampleSize} students in our data chose this — treat it as a
          lead, not a recommendation.
        </p>
      )}
    </div>
  );
}
