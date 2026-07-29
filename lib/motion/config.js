/**
 * Motion constants tuned by the client in a live session on 2026-07-28.
 * These are not defaults to be adjusted — they are decisions.
 * See docs/design/visual-design-system.md §5.
 *
 * Light-theme conversion (2026-07-29, docs/design/light-theme-conversion.md
 * §4): the physics numbers below — SAND.speed/settle/trailDecay/
 * grainsPerMove, FIELD.drift/density/linkDistance — are untouched, byte
 * for byte, and locked by tests/js/motion-config.test.js. Only colours
 * and opacities changed, because on paper the same alpha that read as
 * "subtle" on ink reads as "dirty": every value below was started lower
 * than felt right on a dark canvas and re-checked against a live paper
 * background rather than assumed. All three colour layers moved from a
 * bright/pale violet-cyan family (built to pop off #08070F) to a deeper,
 * more restrained violet — cyan is dropped entirely from the motion
 * layer on paper (see SPOTLIGHT.mid below).
 */
export const SAND = {
  speed: 0.03,          // velocity multiplier off cursor movement
  settle: 0.97,         // per-frame friction; grains glide a long way
  trailDecay: 0.003,    // life lost per frame (~5.5s lifetime)
  grainsPerMove: 10,
  maxGrains: 1400,
  gravity: 0.008,
};

// Spotlight: on ink this ADDED light (a bright violet core fading through
// a pale cyan mid-tone). On paper it must DEEPEN the page instead — a
// soft violet tint, not a glow — so `mid` is now a paler violet-soft
// wash rather than cyan; introducing a second hue here read as a stain
// rather than depth once tested on paper. Same 100px radius, same 68%
// stop.
export const SPOTLIGHT = {
  size: 100,            // px radius following the pointer
  inner: 'rgba(109,40,217,0.10)',
  mid: 'rgba(109,40,217,0.045)',
  stop: '68%',
};

export const FIELD = {
  drift: 0.20,
  density: 7000,        // 1 particle per N px²
  linkDistance: 62,
  repelRadius: 80,
  // Dark violet dots at low opacity (spec's own "roughly
  // rgba(109,40,217,0.22)" starting point) — links a good deal fainter
  // still so the mesh reads as texture, not a drawn grid (grids/box
  // patterns are explicitly rejected — visual-design-system.md rule 1).
  dotColor: 'rgba(109,40,217,0.22)',
  linkColor: 'rgba(109,40,217,0.07)',
};

// Grain colour weighting: 55% deep violet, 30% mid violet, 15%
// violet-ink — a single deepened hue family (the pale-violet/warm-white/
// cyan trio the dark theme used is dropped; cyan in particular is gone
// from the motion layer entirely on paper, see SPOTLIGHT above). The 4th
// element is ONLY a selection-probability weight for pickGrainColor()
// below (must sum to 1) — a grain's actual on-canvas alpha comes from
// its `life` (ParticleField.jsx), which starts at 1 and decays, so every
// grain already renders more opaquely than the field's dots (dotColor's
// fixed 0.22) at spawn — satisfying spec §4's "slightly higher opacity
// than the field" without a separate alpha knob here.
export const GRAIN_COLORS = [
  [109, 40, 217, 0.55],
  [124, 58, 237, 0.30],
  [91, 33, 182, 0.15],
];
