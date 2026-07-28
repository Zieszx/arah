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
