// Position indicator for the quiz — a thin violet arc over a hairline
// track, with the "n/10" readout in the numerals mono face (design
// system §4: numerals and readouts are ui-monospace).
//
// Purely visual: it is aria-hidden because the quiz's polite live region
// already announces "Question n of 10 — …" on every step, and announcing
// both would double up for screen-reader users.
//
// --color-violet on --color-surface (light-theme conversion, 2026-07-29)
// is ~7.10:1 — comfortably past the 3:1 WCAG 1.4.11 needs for a graphical
// arc, and the readout text itself uses --color-text.
import { cn } from '@/lib/utils';

export default function ProgressRing({ step, total, size = 64, className }) {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = total > 0 ? (step + 1) / total : 0;

  return (
    <div
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-violet)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          // The arc grows as a slow CSS transition; the site-wide
          // prefers-reduced-motion rule in globals.css zeroes it.
          style={{ transition: 'stroke-dashoffset 500ms ease-out' }}
        />
      </svg>
      <span className="absolute font-mono text-[12px] text-text/90">
        {step + 1}/{total}
      </span>
    </div>
  );
}
