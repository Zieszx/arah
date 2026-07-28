/**
 * Motion constants tuned by the client in a live session on 2026-07-28.
 * These are not defaults to be adjusted — they are decisions.
 * See docs/design/visual-design-system.md §5.
 */
export const SAND = {
  speed: 0.03,          // velocity multiplier off cursor movement
  settle: 0.97,         // per-frame friction; grains glide a long way
  trailDecay: 0.003,    // life lost per frame (~5.5s lifetime)
  grainsPerMove: 10,
  maxGrains: 1400,
  gravity: 0.008,
};

export const SPOTLIGHT = {
  size: 100,            // px radius following the pointer
  inner: 'rgba(124,58,237,0.44)',
  mid: 'rgba(34,211,238,0.11)',
  stop: '68%',
};

export const FIELD = {
  drift: 0.20,
  density: 7000,        // 1 particle per N px²
  linkDistance: 62,
  repelRadius: 80,
  dotColor: 'rgba(167,139,250,0.50)',
  linkColor: 'rgba(124,58,237,0.22)',
};

// Grain colour weighting: 55% violet-pale, 30% warm white, 15% cyan.
export const GRAIN_COLORS = [
  [196, 181, 253, 0.55],
  [232, 220, 255, 0.30],
  [34, 211, 238, 0.15],
];
