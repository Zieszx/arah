# ARAH Design System & Motion — Implementation Plan (2 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the visual system agreed in the brainstorm — Instrument Serif on ink-black with violet/cyan, an interactive particle field, a brushed-scatter sand cursor and a cursor spotlight — as a reusable component kit, visible on a demo route.

**Architecture:** Tailwind v4 CSS-first tokens in `app/globals.css`, self-hosted fonts via `next/font`, a single shared canvas rendering both the particle field and the sand grains, a CSS-gradient spotlight layer, and Lenis + GSAP + Motion for page motion. Every animated layer has a reduced-motion and a touch fallback.

**Tech Stack:** Next.js 16.2.12 (App Router, JSX), React 19.2.4, Tailwind CSS v4, shadcn/ui, Magic UI, GSAP + ScrollTrigger, Motion, Lenis.

## Global Constraints

- **JSX, never TSX.** No `.ts`/`.tsx`, no `tsconfig.json`, no `typescript` in `package.json`. Transitive tooling deps are exempt.
- **This Next.js is newer than your training data.** Before writing App Router code, read the relevant guide in `node_modules/next/dist/docs/01-app/`. Heed deprecations. Do not assume APIs from memory.
- **Tailwind is v4, not v3.** There is no `tailwind.config.js`. Tokens are declared with `@theme` inside `app/globals.css`, and the entry is `@import "tailwindcss"`. Do not create a v3-style config file.
- **No grids, no box patterns, anywhere in any background.** Explicitly rejected during the brainstorm.
- **Contrast, measured:** `--violet` (`#7C3AED`) on `--ink` (`#08070F`) is **3.52:1** — it passes WCAG AA for *large* text (≥3:1) only. **Never use it for body-sized text.** `--violet-lt` (`#A78BFA`) is 7.4:1 and is the text-safe violet. Reserve `--violet` for large headings, borders, fills and graphics.
- **The CSS reduced-motion block is not sufficient on its own.** It neutralises CSS `animation-duration` / `transition-duration` only. GSAP tweens and Motion animations set styles directly via JS/WAAPI and bypass those properties entirely. **Every JS-driven layer — particle field, sand cursor, spotlight, Lenis, GSAP, Motion — must independently gate on `useMotionCapability()`.** Both mechanisms are required; neither alone is enough. Do not assume the CSS rule has already handled it.
- **Motion values are user-tuned and exact.** Do not adjust them for taste. They are: sand `speed 0.03`, `settle 0.97`, `trailDecay 0.003`, `grainsPerMove 10`; spotlight `100px`; field `drift 0.20`, `density area/7000`, `linkDistance 62`.
- **Every animated layer needs three states**: full, `prefers-reduced-motion`, and touch (pointer: coarse).
- Never commit secrets. `git ls-files | grep -Ei '\.env|\.vercel'` must return nothing.
- Repo root: `E:\Barang Barang\.PersonalWork\Freelance\Nuha\arah\arah`. Branch `main`.

## Palette (exact)

```css
--ink:        #08070F;   --surface:   #12101D;   --surface-2: #1B1730;
--violet:     #7C3AED;   --violet-lt: #A78BFA;   --violet-pl: #C4B5FD;
--cyan:       #22D3EE;   --text:      #EFEDFA;
--muted:      rgba(239,237,250,.62);
--hairline:   rgba(239,237,250,.10);
```

---

## File Structure

| File | Responsibility |
|---|---|
| `app/globals.css` | Tailwind v4 `@theme` tokens, base dark ground, reduced-motion resets |
| `app/layout.jsx` | Font wiring, `<MotionProvider>`, canvas + spotlight layers |
| `lib/fonts.js` | `next/font` declarations for Instrument Serif and Inter |
| `lib/motion/config.js` | The tuned constants — single source, no magic numbers elsewhere |
| `lib/motion/useReducedMotion.js` | Hook: reduced-motion + coarse-pointer detection |
| `components/motion/ParticleField.jsx` | Canvas: particle field + sand grains, spatial hash |
| `components/motion/spatial-hash.js` | Grid bucket helper for O(n) link lookup |
| `components/motion/CursorSpotlight.jsx` | Radial-gradient layer following the pointer |
| `components/motion/SmoothScroll.jsx` | Lenis provider |
| `components/ui/*` | shadcn/ui primitives |
| `components/arah/FlowButton.jsx` | Pill CTA with sliding arrow |
| `components/arah/Kicker.jsx` | `[ bracketed ]` micro-label |
| `components/arah/MatchBar.jsx` | Animated result bar |
| `components/arah/ConfidenceBadge.jsx` | high / medium / low tier badge |
| `app/demo/page.jsx` | Everything on one route, for review |

---

## Task 1: Tokens and fonts

**Files:**
- Create: `lib/fonts.js`
- Modify: `app/globals.css`, `app/layout.jsx`

**Interfaces:**
- Consumes: nothing
- Produces: `displayFont`, `bodyFont` (next/font objects with `.variable`); CSS vars `--color-ink`, `--color-violet` etc. usable as Tailwind classes `bg-ink`, `text-violet-lt`

- [ ] **Step 1: Read the font docs first**

The bundled docs are authoritative for this Next version:
```bash
ls node_modules/next/dist/docs/01-app/ | head -30
```
Find and read the `next/font` guide before writing `lib/fonts.js`.

- [ ] **Step 2: Write `lib/fonts.js`**

```js
import { Instrument_Serif, Inter } from 'next/font/google';

// Display face for headlines and the ARAH logotype.
export const displayFont = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

// UI face for everything else.
export const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
```

- [ ] **Step 3: Replace `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-ink: #08070F;
  --color-surface: #12101D;
  --color-surface-2: #1B1730;
  --color-violet: #7C3AED;
  --color-violet-lt: #A78BFA;
  --color-violet-pl: #C4B5FD;
  --color-cyan: #22D3EE;
  --color-text: #EFEDFA;

  --font-display: var(--font-display), Georgia, serif;
  --font-body: var(--font-body), system-ui, sans-serif;
}

:root {
  --muted: rgba(239, 237, 250, 0.62);
  --hairline: rgba(239, 237, 250, 0.10);
}

html, body {
  background: var(--color-ink);
  color: var(--color-text);
}

body {
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, .font-display {
  font-family: var(--font-display);
  font-weight: 400;
  letter-spacing: -0.005em;
  line-height: 1.1;
}

/* Anyone who asks for less motion gets none of the canvas layers. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Wire fonts in `app/layout.jsx`**

Apply both `.variable` classes to `<html>` and set `lang="en"`. Keep the existing metadata export shape; update the title to `ARAH — Post-SPM Pathway Finder`.

- [ ] **Step 5: Verify**

Run `npm run dev`, load `/`, and confirm in devtools that `--font-display` resolves and the page ground is `#08070F`. Then `npm run build` must succeed. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add lib/fonts.js app/globals.css app/layout.jsx
git commit -m "feat(ui): add design tokens and Instrument Serif + Inter"
```

---

## Task 2: Motion config and capability hook

**Files:**
- Create: `lib/motion/config.js`, `lib/motion/useReducedMotion.js`, `tests/js/motion-config.test.js`

**Interfaces:**
- Produces: `SAND`, `SPOTLIGHT`, `FIELD` constants; `useMotionCapability() -> { reduced, coarse, enabled }`

- [ ] **Step 1: Write the failing test**

`tests/js/motion-config.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { SAND, SPOTLIGHT, FIELD } from '@/lib/motion/config.js';

describe('tuned motion values', () => {
  it('preserves the exact values the client tuned', () => {
    expect(SAND.speed).toBe(0.03);
    expect(SAND.settle).toBe(0.97);
    expect(SAND.trailDecay).toBe(0.003);
    expect(SAND.grainsPerMove).toBe(10);
    expect(SPOTLIGHT.size).toBe(100);
    expect(FIELD.drift).toBe(0.20);
    expect(FIELD.density).toBe(7000);
    expect(FIELD.linkDistance).toBe(62);
  });
});
```

This test exists to stop anyone quietly "improving" the client's tuning.

- [ ] **Step 2: Run it — expect failure**

`npm test` → cannot resolve `@/lib/motion/config.js`.

- [ ] **Step 3: Write `lib/motion/config.js`**

```js
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
```

- [ ] **Step 4: Write `lib/motion/useReducedMotion.js`**

```js
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
```

Note it starts `enabled: false` and turns on after mount — this avoids a server/client hydration mismatch, which React 19 is strict about.

- [ ] **Step 5: Run the test** → passes.

- [ ] **Step 6: Commit**

```bash
git add lib/motion tests/js/motion-config.test.js
git commit -m "feat(motion): add tuned config constants and capability hook"
```

---

## Task 3: Particle field with spatial hash

The naive link lookup is O(n²). At `density = area/7000` a 1920×1080 viewport holds ~296 particles — 43,000 pair checks per frame. A spatial hash makes it near-linear, which matters on the low-end Android devices much of this audience uses.

**Files:**
- Create: `components/motion/spatial-hash.js`, `components/motion/ParticleField.jsx`, `tests/js/spatial-hash.test.js`

**Interfaces:**
- Produces: `buildHash(particles, cellSize) -> Map`, `neighbours(hash, particle, cellSize) -> particle[]`; `<ParticleField />` client component

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from 'vitest';
import { buildHash, neighbours } from '@/components/motion/spatial-hash.js';

describe('spatial hash', () => {
  const cell = 62;

  it('buckets particles by cell', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 500, y: 500 }];
    const hash = buildHash(pts, cell);
    expect(hash.size).toBe(2);
  });

  it('returns near particles and excludes far ones', () => {
    const near = { x: 20, y: 20 };
    const far = { x: 900, y: 900 };
    const subject = { x: 10, y: 10 };
    const hash = buildHash([subject, near, far], cell);
    const found = neighbours(hash, subject, cell);
    expect(found).toContain(near);
    expect(found).not.toContain(far);
  });

  it('finds neighbours across an adjacent cell boundary', () => {
    const a = { x: cell - 1, y: 10 };
    const b = { x: cell + 1, y: 10 };
    const hash = buildHash([a, b], cell);
    expect(neighbours(hash, a, cell)).toContain(b);
  });
});
```

- [ ] **Step 2: Run — expect failure.**

- [ ] **Step 3: Write `components/motion/spatial-hash.js`**

```js
/**
 * Bucket particles into a grid so link lookups only consider the 9 cells
 * around a point instead of every other particle.
 */
export function buildHash(particles, cellSize) {
  const hash = new Map();
  for (const p of particles) {
    const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
    let bucket = hash.get(key);
    if (!bucket) hash.set(key, (bucket = []));
    bucket.push(p);
  }
  return hash;
}

export function neighbours(hash, p, cellSize) {
  const cx = Math.floor(p.x / cellSize);
  const cy = Math.floor(p.y / cellSize);
  const out = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = hash.get(`${cx + dx},${cy + dy}`);
      if (bucket) for (const q of bucket) if (q !== p) out.push(q);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the test** → 3 pass.

- [ ] **Step 5: Write `components/motion/ParticleField.jsx`**

A `'use client'` component that:
- returns `null` when `useMotionCapability().enabled` is false
- sizes the canvas to the viewport, `devicePixelRatio`-aware, re-sizing on resize
- particle count `Math.round((w * h) / FIELD.density)`, **halved below 768px**
- each frame: drift by `FIELD.drift * 2.4`, wrap at edges, repel within `FIELD.repelRadius` of the pointer, draw dots in `FIELD.dotColor`, and link via `neighbours()` within `FIELD.linkDistance` in `FIELD.linkColor` with alpha falling off by distance
- sand grains: on `pointermove`, emit up to `SAND.grainsPerMove` grains along the movement vector with velocity `min(6, speed * SAND.speed) * (0.35 + random*0.9)`, friction `SAND.settle`, gravity `SAND.gravity`, life decremented by `SAND.trailDecay`; cap at `SAND.maxGrains`
- pauses the RAF loop on `document.visibilitychange` and via `IntersectionObserver`
- `aria-hidden="true"`, `pointer-events: none`, `position: fixed; inset: 0; z-index: 0`

Port the physics from `docs/design/prototypes/sand-tuner.html` — it is the reference implementation and already carries the tuned values.

- [ ] **Step 6: Commit**

```bash
git add components/motion tests/js/spatial-hash.test.js
git commit -m "feat(motion): particle field with spatial-hash linking and sand grains"
```

---

## Task 4: Cursor spotlight

**Files:** Create `components/motion/CursorSpotlight.jsx`

A `'use client'` component rendering a fixed full-viewport div at `z-index: 1`, `pointer-events: none`, whose background is
`radial-gradient(${SPOTLIGHT.size}px circle at Xpx Ypx, inner, mid 44%, transparent stop)`.
Update X/Y from `pointermove` **via a CSS custom property**, not React state — setting state on every mousemove will drop frames. When `enabled` is false, render a static centred glow at reduced opacity instead of returning null, so the page keeps its depth on touch devices.

Commit: `feat(motion): cursor spotlight with static touch fallback`

---

## Task 5: Smooth scroll and animation providers

**Files:** Create `components/motion/SmoothScroll.jsx`; modify `app/layout.jsx`; `npm install lenis gsap motion`

- `SmoothScroll.jsx` — `'use client'`, initialises Lenis in an effect, drives it from `requestAnimationFrame`, destroys on unmount, and **does not initialise at all** when reduced motion is set.
- Register GSAP's ScrollTrigger once, client-side only.
- `app/layout.jsx` composes: `<SmoothScroll>` wrapping children, with `<ParticleField />` and `<CursorSpotlight />` as siblings behind them.

Verify `npm run build` succeeds and that scrolling still works with reduced motion enabled in devtools.

Commit: `feat(motion): add Lenis smooth scroll and GSAP registration`

---

## Task 6: Core components

**Files:** Create `components/arah/{FlowButton,Kicker,MatchBar,ConfidenceBadge}.jsx`; run `npx shadcn@latest init` and add `button`, `card`, `progress`.

- **FlowButton** — pill, `linear-gradient(90deg, var(--color-violet), var(--color-cyan))`, white label, arrow translating right on hover, `:focus-visible` ring, `disabled` state. Accepts `as`/`href` to render as a link.
- **Kicker** — renders `[ children ]` in `--color-violet-lt`, uppercase, `letter-spacing: 0.3em`, 10px.
- **MatchBar** — props `{ label, percent, tone }`; rounded track in `--color-ink`, gradient fill animating width from 0 on mount with Motion, percentage right-aligned. Respects reduced motion by rendering at final width immediately.
- **ConfidenceBadge** — props `{ sampleSize }`; `high` ≥20 neutral, `medium` 10–19 amber, `low` <10 amber **plus** the sentence *"Only N students in our data chose this — treat it as a lead, not a recommendation."*

When shadcn asks about config, note this is **Tailwind v4** with CSS-first tokens and JSX (not TSX).

Commit: `feat(ui): core ARAH components on shadcn primitives`

---

## Task 7: Demo route

**Files:** Create `app/demo/page.jsx`

One page showing: the logotype in Instrument Serif, a Kicker, headline scale, FlowButton in all states, MatchBar at 75/22/3%, all three ConfidenceBadge tiers, and the full palette as swatches — over the live particle field, spotlight and sand cursor.

**Verification:**
- `npm run build` succeeds
- `npm test` passes
- Deploy a preview and confirm at 390px and 1280px
- Toggle "Emulate prefers-reduced-motion" in devtools: canvas layers must vanish, page stays usable
- Confirm no grid or box pattern appears anywhere

Commit: `feat(ui): add design system demo route`

---

## Self-Review

**Spec coverage.** Visual system §3 palette → Task 1. §4 typography → Task 1. §5 motion values → Tasks 2–5. §6 components → Task 6. §7 responsive → Tasks 3 and 7. The "no grids" rule is enforced by the Global Constraints and checked in Task 7.

**Type consistency.** `SAND`/`SPOTLIGHT`/`FIELD` are defined once in Task 2 and consumed by name in Tasks 3–4. `useMotionCapability()` returns `{reduced, coarse, enabled}` in Task 2 and is destructured identically in Tasks 3–5. `buildHash`/`neighbours` signatures match between Task 3's test and implementation.

**Known risk.** Task 3 is the largest single component. If its reviewer finds it doing too much, splitting grain physics into `components/motion/sand.js` is the intended cut line.
