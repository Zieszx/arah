import { cn } from '@/lib/utils';
import Kicker from '@/components/arah/Kicker.jsx';

/**
 * One stat tile on the admin overview (Task 2). Three distinct states,
 * never collapsed into one another:
 *
 *  - a real number       -> the count, formatted, plus a one-line caption
 *    explaining what it counts (always shown — a raw number with no
 *    context is not "data density", it's a guess).
 *  - `0`, a legitimate count today -> the count PLUS `zeroHint`, which
 *    says what will appear here and why it's empty right now. Never a
 *    bare "No data" (the task brief's explicit instruction).
 *  - `null`, the count could not be read -> "—" and a plain "couldn't
 *    load" note, so a failed query reads as failed, never as a
 *    (misleading) real zero.
 *
 * The numeral is `font-mono` per the design system's numerals rule:
 * Instrument Serif's old-style `1` reads as a lowercase `l` at display
 * size — this shipped as a real bug once already, so every count on this
 * page (a screen that is nothing BUT counts) uses the monospace face.
 */
export default function StatCard({ label, value, caption, zeroHint, className }) {
  const unavailable = value === null || value === undefined;
  const isZero = value === 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-6',
        className
      )}
    >
      <Kicker as="dt" className="text-violet-ink">
        {label}
      </Kicker>
      <dd className="m-0">
        <p
          className={cn(
            'font-mono text-4xl font-medium leading-none tabular-nums',
            unavailable ? 'text-muted-foreground' : 'text-ink'
          )}
        >
          {unavailable ? '—' : value.toLocaleString('en-US')}
        </p>
        {unavailable ? (
          <p className="mt-3 text-sm leading-[1.5] text-danger">
            Couldn’t load this count just now. The rest of the page is unaffected — refresh to retry.
          </p>
        ) : isZero && zeroHint ? (
          <p className="mt-3 text-sm leading-[1.5] text-muted-foreground">{zeroHint}</p>
        ) : caption ? (
          <p className="mt-3 text-sm leading-[1.5] text-muted-foreground">{caption}</p>
        ) : null}
      </dd>
    </div>
  );
}
