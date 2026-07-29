'use client';

// §5b staggered reveal (docs/design/visual-design-system.md). Wraps a list;
// children rise into place one at a time, in DOM order, as they enter the
// viewport. The values below are the client's own — do not adjust for taste.
//
// Reduced-motion / touch handling follows the MatchBar pattern exactly:
// useMotionCapability() starts `enabled: false` on every mount (capability
// isn't knowable until an effect runs client-side) and flips `true` after
// mount for capable users only. While `enabled` is false each child renders
// as a plain, fully visible <div> — a reduced-motion user is NEVER shown
// `opacity: 0` waiting for an animation that will not run (§5b's explicit
// trap). When `enabled` flips, the wrapper element type changes to
// motion.div, which forces a genuine fresh mount with the hidden `initial`
// applied, so capable users get the real 16px rise.
//
// Hook-order rule: useMotionCapability() is called unconditionally, before
// any conditional rendering.
import { Children } from 'react';
import { motion } from 'motion/react';
import { useMotionCapability } from '@/lib/motion/useReducedMotion';

export const STAGGER = {
  delayStep: 60, // ms between successive children
  duration: 420, // ms
  translateY: 16, // px, rises into place
  easing: [0.16, 1, 0.3, 1], // ease-out, no overshoot — nothing bounces
  once: true, // fires on first enter only, never replays on scroll-back
  // §5b: never stagger more than ~8 items — beyond that the last item
  // feels broken. Items past this index render instantly.
  maxStagger: 8,
};

export default function StaggerReveal({ children, className, itemClassName }) {
  const { enabled } = useMotionCapability();
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, i) => {
        const animated = enabled && i < STAGGER.maxStagger;
        if (!animated) {
          // Final position immediately: reduced motion, touch, SSR/first
          // paint, and the tail of long lists.
          return (
            <div key={child.key ?? i} className={itemClassName}>
              {child}
            </div>
          );
        }
        return (
          <motion.div
            key={child.key ?? i}
            initial={{ opacity: 0, y: STAGGER.translateY }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: STAGGER.once }}
            transition={{
              duration: STAGGER.duration / 1000,
              ease: STAGGER.easing,
              delay: (i * STAGGER.delayStep) / 1000,
            }}
            className={itemClassName}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}
