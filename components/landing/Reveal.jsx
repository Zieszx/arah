'use client';

// Whole-section scroll reveal for the landing page narrative — GSAP +
// ScrollTrigger, gated on useMotionCapability() (lib/motion/useReducedMotion.js).
//
// Reuses the exact §5b staggered-reveal values (16px rise, 420ms, ease-out,
// fires once — see docs/design/visual-design-system.md §5b and
// components/motion/StaggerReveal.jsx). §5b's values were tuned for list
// items rising one at a time; this reuses them for a whole *section*
// entering the viewport so the two motion languages on this page —
// StaggerReveal's per-item Motion animation inside "How it works", and this
// GSAP ScrollTrigger animation around each section — read as one system
// instead of two different speeds.
//
// The ease is GSAP's built-in `expo.out` rather than a CustomEase port of
// §5b's literal cubic-bezier(0.16, 1, 0.3, 1): the two curves are visually
// indistinguishable (both are a fast start settling to a dead stop, no
// overshoot), and `expo.out` ships in gsap-core with zero extra bytes,
// where the CustomEase plugin does not. On a page this performance-
// sensitive — loading for every visitor, many on cheap Android over patchy
// data, with a canvas particle field already running — that is bytes worth
// not spending for a curve nobody could tell apart by eye.
//
// The critical guarantee, called out explicitly in the task brief: a
// reduced-motion or coarse-pointer user must see every section fully
// visible and readable on FIRST PAINT, never `opacity: 0` waiting for an
// animation that will not run. That is achieved structurally, not by a
// runtime check inside the animation:
//
//  - `useMotionCapability()` starts `enabled: false` on every mount
//    (capability isn't knowable until an effect runs client-side) and only
//    flips `true` after mount, for capable users only.
//  - The wrapped element is a plain <Comp> with whatever `className` the
//    caller passed — no inline style, no opacity, no transform — until the
//    effect below decides to touch it.
//  - GSAP only ever runs inside `if (!enabled) return;`. For reduced-motion
//    and coarse-pointer users `enabled` never becomes true, so that branch
//    never executes and the DOM is never touched: the section stays at its
//    normal, fully-opaque position for the entire lifetime of the page.
//  - `app/globals.css`'s site-wide `prefers-reduced-motion` media block is
//    CSS-only and does not stop GSAP (GSAP drives inline styles directly,
//    bypassing CSS transition/animation properties entirely) — this
//    component is the actual guard for the landing page's GSAP layer, per
//    the plan's explicit warning.
//
// Hook-order rule: useMotionCapability() runs unconditionally, before any
// conditional rendering, on every render.
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionCapability } from '@/lib/motion/useReducedMotion';

let registered = false;
function registerOnce() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export default function Reveal({ children, className, as: Comp = 'div', ...rest }) {
  const { enabled } = useMotionCapability();
  const ref = useRef(null);

  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    registerOnce();

    const el = ref.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, [enabled]);

  return (
    <Comp ref={ref} className={className} {...rest}>
      {children}
    </Comp>
  );
}
