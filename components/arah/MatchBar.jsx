'use client';

import { Progress as ProgressPrimitive } from 'radix-ui';
import { motion } from 'motion/react';
import { useMotionCapability } from '@/lib/motion/useReducedMotion.js';
import { cn } from '@/lib/utils';

// Light-theme re-tune (light-theme-conversion.md §5): the amber gradient's
// start was a hardcoded #F59E0B (amber-500) — measured 1.93-2.15:1 against
// paper/surface/surface-2, the same "cannot survive on white" failure the
// spec calls out for the old badge amber. Re-derived to amber-700, paired
// with --color-amber (amber-800) at the far end — both clear 3:1 against
// every background this bar sits on (paper 4.83/6.81, surface 5.02/7.09,
// surface-2 4.51/6.37), which matters most at the 3% width case (the
// smallest real fill on /results): the fill must still read as a distinct
// colour from the --surface-2 track, not just a sliver of paler noise.
const TONE_GRADIENTS = {
  cyan: 'linear-gradient(90deg, var(--color-violet), var(--color-cyan))',
  violet: 'linear-gradient(90deg, var(--color-violet), var(--color-violet-lt))',
  amber: 'linear-gradient(90deg, #B45309, var(--color-amber))',
};

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Shows a student their match result. The percentage text and the bar's
 * width are computed independently of one another — the number is a
 * plain text node that is always the final, correct value on every
 * render, regardless of what the fill animation is doing.
 *
 * `useMotionCapability()` is called unconditionally, every render, with
 * no early return before it — see the module doc in
 * lib/motion/useReducedMotion.js and app-level notes on the hook-order
 * crash this component is specifically at risk of reintroducing.
 *
 * `enabled` starts `false` on every mount (reduced-motion status isn't
 * knowable until an effect runs client-side) and only flips `true`
 * after mount for capable users. Gating the fill's `initial` prop on a
 * *value that changes after mount* would do nothing useful with a
 * plain conditional prop — Motion only honours `initial` at the moment
 * an element is actually mounted. So the `key` below is deliberately
 * swapped when `enabled` flips: that forces Motion to treat the
 * capable-user case as a genuine fresh mount (a real 0 -> final
 * transition), while the reduced-motion / coarse-pointer case keeps
 * the same key forever, mounts once directly at its final width, and
 * therefore never renders a transient 0% frame for someone who asked
 * for less motion.
 */
export default function MatchBar({ label, percent, tone = 'cyan', className }) {
  const { enabled } = useMotionCapability();

  const clamped = clampPercent(percent);
  const rounded = Math.round(clamped);
  const gradient = TONE_GRADIENTS[tone] ?? TONE_GRADIENTS.cyan;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm text-text">
        <span>{label}</span>
        <span className="tabular-nums font-medium">{rounded}%</span>
      </div>
      {/* Track on --surface-2, per light-theme-conversion.md §5 — --ink is
          now body text, not a background; bg-ink here would render a
          near-black track, not the light "sunken" groove the light theme
          wants. */}
      <ProgressPrimitive.Root
        value={rounded}
        max={100}
        aria-label={label}
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
      >
        <motion.div
          key={enabled ? 'animated' : 'static'}
          initial={enabled ? { width: '0%' } : false}
          animate={{ width: `${clamped}%` }}
          transition={enabled ? { duration: 0.8, ease: [0.16, 1, 0.3, 1] } : { duration: 0 }}
          style={{ backgroundImage: gradient }}
          className="h-full rounded-full"
        />
      </ProgressPrimitive.Root>
    </div>
  );
}
