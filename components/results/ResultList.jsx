'use client';

// The ranked top-five list. Each field gets a MatchBar (probability),
// the explainability sentence ("N of the 207 students most like you
// studied this"), a ConfidenceBadge (with its mandatory low-sample
// sentence), and AlumniContext (satisfaction / route, or the honest
// suppression sentence).
//
// Cards stagger in per §5b via StaggerReveal. Field names render through
// displayLabel — the stored rows keep the raw survey strings (including
// the "Dentristry" typo) and the correction happens here, at the last
// moment before a human reads it, never in data.
import { Card } from '@/components/ui/card';
import MatchBar from '@/components/arah/MatchBar.jsx';
import ConfidenceBadge from '@/components/arah/ConfidenceBadge.jsx';
import StaggerReveal from '@/components/motion/StaggerReveal.jsx';
import AlumniContext from './AlumniContext.jsx';
import { displayLabel } from '@/lib/i18n/labels';
import en from '@/lib/i18n/en';

function finite(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

export default function ResultList({ entries, total }) {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  return (
    <StaggerReveal className="flex flex-col gap-4 md:gap-5">
      {entries.map((entry, i) => (
        <Card
          key={entry.field}
          data-field={entry.field}
          className="gap-0 bg-surface p-6 md:p-8"
        >
          <MatchBar
            label={displayLabel(entry.field)}
            percent={finite(entry.probability) ? entry.probability * 100 : 0}
            // Violet leads, cyan supports: only the top match carries the
            // full violet→cyan gradient; the rest stay in the violet family.
            tone={i === 0 ? 'cyan' : 'violet'}
          />

          {finite(entry.alumni_count) && finite(total) && total > 0 ? (
            <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-text">
              <span className="font-mono">{entry.alumni_count}</span>{' '}
              {en.results.explainOf} <span className="font-mono">{total}</span>{' '}
              {en.results.explainTail}
            </p>
          ) : null}

          <ConfidenceBadge sampleSize={entry.alumni_count} className="mt-4" />

          <AlumniContext
            entry={entry}
            className={
              entry.suppressed
                ? 'mt-4 max-w-[52ch] border-t border-hairline pt-4 text-sm leading-[1.6] text-muted-foreground'
                : 'mt-5 flex flex-wrap gap-x-10 gap-y-4 border-t border-hairline pt-5'
            }
          />
        </Card>
      ))}
    </StaggerReveal>
  );
}
