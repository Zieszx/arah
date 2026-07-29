'use client';
import { useEffect, useState } from 'react';

/**
 * Decides whether the canvas motion layers should run at all.
 * `enabled` is false for reduced-motion users and for touch devices,
 * where a cursor-driven effect has no meaning and costs battery.
 */
export function useMotionCapability() {
  const [state, setState] = useState({ reduced: false, coarse: false, enabled: false });

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');

    const update = () => {
      const reduced = reducedQuery.matches;
      const coarse = coarseQuery.matches;
      setState({ reduced, coarse, enabled: !reduced && !coarse });
    };

    update();
    reducedQuery.addEventListener('change', update);
    coarseQuery.addEventListener('change', update);
    return () => {
      reducedQuery.removeEventListener('change', update);
      coarseQuery.removeEventListener('change', update);
    };
  }, []);

  return state;
}

/**
 * `prefers-reduced-motion` only — no pointer-type conflation.
 *
 * useMotionCapability() above also disables for `pointer: coarse`, which is
 * correct for cursor-driven effects (sand, spotlight) but wrong for the §5c
 * auth panel: a touchscreen tablet at ≥768px should still get the sliding
 * panel, since the slide-vs-crossfade choice there is a *breakpoint*
 * decision, not a motion-preference one. This hook isolates the one signal
 * that should ever cancel the slide.
 *
 * Same shape as useMotionCapability(): starts `false` on every mount
 * (matchMedia isn't knowable until an effect runs client-side) and flips
 * after mount. Call unconditionally, before any conditional rendering —
 * the project's hook-order rule.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}
