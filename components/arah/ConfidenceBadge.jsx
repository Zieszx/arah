import { cn } from '@/lib/utils';

const TIER_STYLE = {
  high: 'border-white/10 bg-white/5 text-violet-lt',
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
 */
export default function ConfidenceBadge({ sampleSize, className }) {
  const tier = getConfidenceTier(sampleSize);

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
