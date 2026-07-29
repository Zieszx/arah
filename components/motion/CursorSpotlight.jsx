'use client';

import { useEffect, useRef } from 'react';
import { useMotionCapability } from '@/lib/motion/useReducedMotion.js';
import { SPOTLIGHT } from '@/lib/motion/config.js';

// Shared gradient shape: on paper this deepens the page rather than adding
// light — a soft violet tint (both stops are the same hue at different
// alphas, see lib/motion/config.js's light-theme note) that fades to
// nothing at SPOTLIGHT.stop. Values come from lib/motion/config.js — never
// hardcoded here, the config test locks the physics constants and a
// duplicate would silently drift.
const GRADIENT = `radial-gradient(${SPOTLIGHT.size}px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${SPOTLIGHT.inner}, ${SPOTLIGHT.mid} 44%, transparent ${SPOTLIGHT.stop})`;

/**
 * Fixed, full-viewport glow that follows the pointer.
 *
 * Position is written straight to a CSS custom property on the element via
 * a ref — never through React state. Setting state on every `pointermove`
 * would re-render the tree 60+ times a second and drop frames; a CSS custom
 * property update does not touch React at all.
 *
 * Unlike ParticleField, this never returns null: when motion is disabled
 * (reduced motion or a coarse/touch pointer) it renders a static, centred
 * glow at reduced opacity instead, so the page keeps its intended depth for
 * touch and reduced-motion users — they just don't get the tracking motion.
 */
export default function CursorSpotlight() {
  const { enabled } = useMotionCapability();
  const elRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const el = elRef.current;
    if (!el) return undefined;

    function onPointerMove(e) {
      el.style.setProperty('--spot-x', `${e.clientX}px`);
      el.style.setProperty('--spot-y', `${e.clientY}px`);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [enabled]);

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        background: GRADIENT,
        opacity: enabled ? 1 : 0.35,
      }}
    />
  );
}
