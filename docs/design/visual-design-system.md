# ARAH — Visual Design System

**Locked 2026-07-28.** Everything decided during the visual brainstorm, including what
was rejected and why. This is the reference for every screen built.

---

## 1. References studied

| Reference | What was taken | What was left |
|---|---|---|
| [valeran.eu](https://www.valeran.eu/) | Editorial layout, near-black ground, large display serif, `[ bracketed ]` micro-labels, generous negative space | Its warm brown/sepia palette; the photographic silk textures |
| [obermann-webdesign.de](https://obermann-webdesign.de/) | Dark gradient ground with slow drifting shapes behind, centred hero, pill CTA, "scroll to explore" affordance | Its plum/aubergine hue; the wide-tracked mono display face |
| [21st.dev FlowButton](https://21st.dev/@xubohuah/components/flow-button) | Pill button with sliding arrow — the primary CTA pattern | — |
| [21st.dev button-download](https://21st.dev/@voxlet-ui/components/button-download) | Progress-state button pattern, for quiz submit | — |
| [21st.dev menu-toggle-icon](https://21st.dev/@sshahaider/components/menu-toggle-icon) | Animated hamburger ↔ close for mobile nav | — |

**Through-line:** dark ground, one strong accent, slow motion, lots of air.

---

## 2. Decision trail

Four palette directions were mocked as identical heroes so only colour varied:

| | Direction | Outcome |
|---|---|---|
| A | Midnight Indigo + Amber | rejected |
| B | Deep Teal + Signal Green | rejected |
| C | **Ink Black + Electric Violet** | **palette chosen** |
| D | **Warm Black + Coral, editorial serif** | **layout/typography treatment chosen** |

Final direction = **D's editorial serif treatment rendered in C's palette.**

Explicitly rejected: **grid and box patterns in the background.** Not used anywhere.

Background motion — four options tested live:

| | Option | Outcome |
|---|---|---|
| 1 | Aurora drift (CSS clouds) | rejected |
| 2 | **Interactive particle field** | **chosen — site-wide** |
| 3 | **Cursor spotlight** | **chosen — layered on top** |
| 4 | Meteors | rejected — pulls the eye off the headline |

Cursor sand behaviour — three physics models tested:

| | Model | Outcome |
|---|---|---|
| A | Pouring sand (gravity fall) | rejected |
| B | Trailing stream (chain with lag) | rejected |
| C | **Brushed scatter** — grains fly along the direction of travel, then decelerate | **chosen** |

First pass was rejected as too fast with too large a spotlight. Values below are the
user's own tuned settings from the live slider session.

Typeface — three editorial serifs tested in-situ:

| | Face | Outcome |
|---|---|---|
| 1 | **Instrument Serif** | **chosen** |
| 2 | Bodoni Moda | rejected — hairlines fragile on phone screens |
| 3 | Fraunces | rejected — warmer than the direction wanted |

---

## 3. Colour

```css
--ink:        #08070F;   /* page ground */
--surface:    #12101D;   /* cards, panels, inputs */
--surface-2:  #1B1730;   /* raised / hover */
--violet:     #7C3AED;   /* primary accent */
--violet-lt:  #A78BFA;   /* kickers, labels, links */
--violet-pl:  #C4B5FD;   /* sand grains, particle dots */
--cyan:       #22D3EE;   /* secondary accent, gradient partner */
--text:       #EFEDFA;   /* body text */
--muted:      rgba(239, 237, 250, 0.62);
--hairline:   rgba(239, 237, 250, 0.10);
```

**Roles**
- Primary CTA: `linear-gradient(90deg, var(--violet), var(--cyan))`, white label.
- Kickers / micro-labels: `--violet-lt`, uppercase, `letter-spacing: 0.3em`, wrapped in `[ ]`.
- Never place `--violet` as text on `--ink` — it fails contrast. Use `--violet-lt` or lighter.
  (This exact mistake was caught in the pitch deck; do not repeat it.)
- Semantic: success `--cyan`, warning `#FFB627`, danger `#FF6B6B`. Used only for
  confidence badges and form errors, never decoratively.

Contrast: `--text` on `--ink` and `--violet-lt` on `--surface` both clear WCAG AA.

---

## 4. Typography

| Role | Face | Notes |
|---|---|---|
| Display / headlines | **Instrument Serif** 400 | `letter-spacing: -0.005em`, `line-height: 1.08–1.12` |
| Body / UI | **Inter** 400/500/600 | |
| Numerals, readouts | `ui-monospace, Menlo, monospace` | Match percentages, model stats |

Both self-hosted through `next/font` — no external font requests, no layout shift.

Scale (desktop → mobile): display 64/42 · h1 42/30 · h2 30/24 · h3 21/18 ·
body 16/15 · small 13/12 · kicker 10/9.

The logotype **ARAH** is Instrument Serif at `letter-spacing: 0.20em`.

---

## 5. Motion

### Tuned configuration — exact values, do not change without asking

```js
// lib/motion/config.js
export const SAND = {
  speed:         0.03,   // velocity multiplier off cursor movement
  settle:        0.97,   // per-frame friction (grains glide a long way)
  trailDecay:    0.003,  // life lost per frame → ~5.5s grain lifetime
  grainsPerMove: 10,
  maxGrains:     1400,
  gravity:       0.008,  // barely-there downward bias
};

export const SPOTLIGHT = {
  size: 100,             // px radius following the cursor
  inner: 'rgba(124,58,237,0.44)',
  mid:   'rgba(34,211,238,0.11)',
  stop:  '68%',
};

export const FIELD = {
  drift:        0.20,    // particle field speed
  density:      7000,    // 1 particle per N px² (raised ~55% from first pass)
  linkDistance: 62,      // px — draw a line between particles closer than this
  repelRadius:  80,      // cursor push-away radius
  dotColor:     'rgba(167,139,250,0.50)',
  linkColor:    'rgba(124,58,237,0.22)',
};
```

Grain colour is weighted: 55% `--violet-pl`, 30% `#E8DCFF`, 15% `--cyan`.

### Layer order

```
z0  particle field        canvas, full viewport, fixed
z1  cursor spotlight      radial gradient div, follows pointer
z2  sand grains           same canvas as z0, drawn after the field
z3  page content
```

### Page motion

- **Lenis** global smooth scroll.
- **GSAP + ScrollTrigger** for landing-page storytelling (findings reveal on scroll).
- **Motion** for quiz question transitions and results bar fills.
- Slow over busy. Nothing bounces.

### Non-negotiable guards

- `prefers-reduced-motion` → no sand, no drift, spotlight becomes a static glow.
- Sand cursor is **pointer-only**; touch devices never render it.
- Field pauses via IntersectionObserver when off-screen, and on `visibilitychange`.
- Particle linking uses a **spatial hash grid**, not an O(n²) pair loop — same look,
  far less CPU on the low-end Android devices much of the audience uses.
- Density scales down below 768px.

---

## 5b. Staggered reveal — added 2026-07-29

Cards and list items appear one at a time as they enter the viewport. Client-chosen
values, do not adjust for taste:

```js
// components/motion/StaggerReveal.jsx
const STAGGER = {
  delayStep: 60,      // ms between successive children
  duration: 420,      // ms
  translateY: 16,     // px, rises into place
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',   // ease-out, no overshoot
  once: true,         // fires on first enter only, never replays on scroll-back
};
```

Rationale: 16px and 420ms match the weighted, settling feel of the tuned sand physics.
**Nothing bounces** — no spring, no overshoot, no scale. A bigger movement was
considered and rejected because it competes with the particle field already moving
behind it.

Rules:
- Wrap a list; children animate in DOM order.
- Fires **once** on enter. Replaying on every scroll-back is nauseating on long pages.
- Under `prefers-reduced-motion`, children render at final position immediately — never
  `opacity: 0` with no fallback, which leaves reduced-motion users staring at a blank page.
- Never stagger more than ~8 items; beyond that the last item feels broken. Long lists
  animate the first 8 and render the rest instantly.

## 5c. Auth layout — added 2026-07-29

Signup and login use a **two-column split** (after the 21st.dev `sign-in` pattern):

| Side | Content |
|---|---|
| **Left** | ARAH logotype, `Kicker`, Instrument Serif headline, the form, `FlowButton` |
| **Right** | A rotating **real advice quote** from the survey, with `[ FROM A REAL STUDENT ]` as its kicker, over the particle field |

The right panel uses genuine free-text advice from the 207 respondents — not a stock
photo, not invented testimonials. It demonstrates the product's value on the screen where
a student is deciding whether to bother.

**Privacy constraint, non-negotiable.** `alumni_profiles` is not client-readable. Expose
quotes through a dedicated `SECURITY DEFINER` view returning **only the advice text** —
no field of study, no demographics, no satisfaction score, no id. A quote alone is not
identifying; a quote plus a field with n=7 is. Never join them for this panel.

Below 768px the panel stacks **above** the form showing a single quote, so the human
proof is seen before the work is asked for.

---

## 6. Components

| Component | Pattern |
|---|---|
| Primary CTA | Pill, violet→cyan gradient, arrow slides right on hover (FlowButton) |
| Secondary | Pill, 1px `--hairline` border, transparent fill |
| Submit (quiz) | Progress-fill button while the model runs (button-download pattern) |
| Mobile nav | Animated hamburger ↔ close (menu-toggle-icon) |
| Card | `--surface`, `border-radius: 16px`, 1px `--hairline`, no drop shadow on dark |
| Kicker | `[ 207 students before you ]` — violet-lt, uppercase, wide tracking |
| Match bar | Rounded track `--ink`, fill gradient, animates width on mount |
| Confidence badge | `high` neutral · `medium` amber · `low` amber + explanatory sentence |
| Image mask | Concave/scalloped corners, borrowed from Valeran, used on `/explore` |

Base components come from **shadcn/ui**, effects from **Magic UI**, and
**PrimeReact DataTable** is used on `/explore` only, with its CSS scoped to that route
so it cannot leak into the Tailwind theme.

---

## 7. Layout

Breakpoints: **320 · 390 · 768 · 1280 · 1920**.

- Content max-width 1280px, gutters 24px mobile / 40px tablet / 64px desktop.
- Hero is left-aligned editorial (Valeran), not centred — this is the deliberate
  departure from the Obermann reference.
- Vertical rhythm on an 8px base; section padding 96px desktop / 56px mobile.
- Body text never exceeds 68 characters per line.

---

## 8. Prototypes

Working reference implementations are kept in `docs/design/prototypes/`. They are
self-contained HTML — open directly in a browser. The physics in `sand-tuner.html` and
`serif-pairing.html` is the source the production React components should be ported from.

| File | Contents |
|---|---|
| `color-direction.html` | The four palette directions, animated |
| `background-motion.html` | Aurora / particles / spotlight / meteors, live |
| `sand-cursor.html` | The three sand physics models side by side |
| `sand-tuner.html` | Live slider tuner — how the final values were arrived at |
| `serif-pairing.html` | Instrument Serif vs Bodoni Moda vs Fraunces, final motion baked in |

---

## 9. Rules

1. No grid or box patterns in any background. Rejected explicitly.
2. Never `--violet` as text on `--ink`.
3. One accent per screen. Violet leads; cyan supports. Never equal weight.
4. Motion is slow. If it reads as energetic, it is wrong.
5. Every animated layer must have a reduced-motion and a touch fallback.
6. Headlines are Instrument Serif. UI is Inter. No third face.
