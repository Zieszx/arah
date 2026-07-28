'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionCapability } from '@/lib/motion/useReducedMotion.js';

let scrollTriggerRegistered = false;

/**
 * Registers GSAP's ScrollTrigger plugin exactly once, client-side only.
 * Safe to call on every render/mount — the module-scope flag makes it a
 * no-op after the first call.
 */
function registerScrollTriggerOnce() {
  if (scrollTriggerRegistered) return;
  gsap.registerPlugin(ScrollTrigger);
  scrollTriggerRegistered = true;
}

/**
 * Wraps children with Lenis-driven smooth scrolling and registers GSAP's
 * ScrollTrigger so downstream components can build scroll-linked animations
 * against Lenis's virtual scroll.
 *
 * Deliberately does **not** initialise Lenis at all when the user has
 * `prefers-reduced-motion` set. Hijacking scroll physics for someone who
 * explicitly asked their OS for less motion is exactly the harm that
 * setting exists to prevent, so this isn't a "reduce the easing" toggle —
 * Lenis is skipped entirely and the browser's native scrolling is left
 * completely alone.
 */
export default function SmoothScroll({ children }) {
  const { reduced, enabled } = useMotionCapability();

  useEffect(() => {
    registerScrollTriggerOnce();
  }, []);

  useEffect(() => {
    // `enabled` starts false on the very first render (before the
    // useMotionCapability effect has measured matchMedia) and only becomes
    // true once capability has been positively confirmed as "no reduced
    // motion, no coarse pointer". That fail-safe default — no Lenis until
    // proven safe — is exactly what we want here: gating on `reduced`
    // directly would risk a brief window where Lenis initialises before the
    // reduced-motion check has actually run. The `reduced` check is kept as
    // an explicit belt-and-braces guard against ever driving Lenis for a
    // reduced-motion user, even if `enabled`'s definition changes later.
    if (!enabled || reduced) return undefined;

    const lenis = new Lenis();

    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    });

    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [enabled, reduced]);

  return children;
}
