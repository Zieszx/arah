// Alumni context for one ranked field — the honest half of the results
// page. Two hard rules, both product integrity:
//
// 1. When the stored entry is `suppressed`, the aggregates were withheld
//    at source for k-anonymity (the keys are absent from the row, not
//    null). We show the sample size and say plainly WHY the statistics
//    are missing. Never a 0, never "—", never "N/A", never an imputed
//    value — a fabricated statistic here is worse than an absent one.
// 2. Even on unsuppressed entries, each stat renders only if it is
//    actually present in the stored row. Absence renders nothing.
//
// Pure presentational component: no hooks, no client state. It is pulled
// into the client bundle by ResultList but is server-safe as written.
import en from '@/lib/i18n/en';
import { displayLabel } from '@/lib/i18n/labels';

function finite(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function Stat({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-[15px] text-text">{children}</dd>
    </div>
  );
}

export default function AlumniContext({ entry, className }) {
  if (!entry) return null;

  if (entry.suppressed) {
    return (
      <p data-suppressed="true" className={className ?? 'text-sm leading-[1.6] text-muted-foreground'}>
        {finite(entry.alumni_count)
          ? `${en.results.suppressedLead} ${entry.alumni_count} ${en.results.suppressedTail}`
          : en.results.suppressedNoCount}
      </p>
    );
  }

  const stats = [];
  if (finite(entry.avg_satisfaction)) {
    stats.push(
      <Stat key="sat" label={en.results.statSatisfaction}>
        {entry.avg_satisfaction}{' '}
        <span className="text-muted-foreground">{en.results.statSatisfactionOutOf}</span>
      </Stat>
    );
  }
  if (finite(entry.pct_dissatisfied)) {
    stats.push(
      <Stat key="dis" label={en.results.statDissatisfied}>
        {entry.pct_dissatisfied}%
      </Stat>
    );
  }
  if (typeof entry.common_preu === 'string' && entry.common_preu) {
    stats.push(
      <Stat key="preu" label={en.results.statPreu}>
        {displayLabel(entry.common_preu)}
      </Stat>
    );
  }

  // An unsuppressed entry with nothing reportable renders nothing at all —
  // absence, not invention.
  if (stats.length === 0) return null;

  return (
    <dl className={className ?? 'flex flex-wrap gap-x-10 gap-y-4'}>{stats}</dl>
  );
}
