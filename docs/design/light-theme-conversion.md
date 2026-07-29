# ARAH — Light theme conversion

**Decided 2026-07-29.** The client wants the product to read **formal and educational**
rather than nocturnal-premium: paper ground, dark text, restrained accents. The motion
identity chosen in the live tuning session — particle field, brushed-scatter sand cursor,
cursor spotlight — **stays**, re-tuned for light.

This supersedes the dark palette in `visual-design-system.md` §3. Everything else in that
document — the editorial layout, Instrument Serif, the `[ bracketed ]` motif, the stagger
spec, the auth panel, "no grids or box patterns" — still stands.

---

## 1. The trap: you cannot invert this palette

Every contrast pair in the dark theme was chosen *for* a dark ground. Inverting them
produces text nobody can read. Measured, on a `#FBFAFC` paper ground:

| Dark-theme token | On paper | Verdict |
|---|---|---|
| `--violet-lt` `#A78BFA` | **1.9:1** | unreadable |
| `--cyan` `#22D3EE` | **1.9:1** | unreadable |
| `--violet-pl` `#C4B5FD` | **1.6:1** | invisible |
| amber `#FFB627` | **1.8:1** | unreadable |

**Every accent must be re-derived darker, not reused.** On dark, accents get *lighter* to
gain contrast; on light they must get *darker*. Any token carried across unchanged is a
bug.

## 2. Palette

```css
/* ground + structure */
--paper:       #FBFAFC;   /* page ground */
--surface:     #FFFFFF;   /* cards, panels — raised above paper */
--surface-2:   #F3F2F7;   /* sunken, hover, table stripes */
--ink:         #12101D;   /* body text, headings */
--muted:       rgba(18, 16, 29, 0.64);
--hairline:    rgba(18, 16, 29, 0.12);

/* accents — deeper than their dark-theme counterparts */
--violet:      #6D28D9;   /* primary accent: fills, borders, large text */
--violet-ink:  #5B21B6;   /* text-safe violet on paper */
--violet-soft: #EDE9FE;   /* tints, selected backgrounds */
--teal:        #0E7490;   /* secondary accent, replaces cyan for anything textual */
--teal-soft:   #CFFAFE;   /* tints */
```

**Targets, all to be measured and reported, never assumed:**

| Pair | Minimum |
|---|---|
| `--ink` on `--paper` | 4.5:1 body |
| `--violet-ink` on `--paper` | 4.5:1 body |
| `--violet` on `--paper` | 3:1 large text and graphics |
| `--muted` on `--paper` | 4.5:1 |
| white on `--violet` | 4.5:1 |

## 3. Charts

`--chart-1..5` must be re-derived for a light ground. The cool/warm doublet reasoning
holds — `chart-1` and `chart-2` stay the colour-blind-safe pair — but both need
darkening. Amber on white is the worst offender in the old set and cannot survive.

Every series colour must clear **3:1 against `--surface`** (WCAG 1.4.11, graphical
objects). Report all five measured ratios.

## 4. Motion, re-tuned for paper

The physics constants in `lib/motion/config.js` — speed `0.03`, settle `0.97`,
trailDecay `0.003`, 10 grains, drift `0.20`, density `7000`, linkDistance `62` — are the
client's tuned values and **do not change**. Only the *colours and opacities* change.

- **Particles:** dark violet at low opacity, roughly `rgba(109,40,217,0.22)`, links
  fainter still. On paper, the same opacity that read as "subtle" on ink reads as
  "dirty" — start lower than feels right and check on a real screen.
- **Sand grains:** deeper violet, slightly higher opacity than the field so the trail
  still reads.
- **Spotlight:** on ink it *added* light. On paper it must *deepen* — a soft violet tint
  rather than a glow. Same 100px radius.

If a re-tuned layer looks like smudging rather than texture, say so plainly and propose a
value rather than shipping it.

## 5. Components to re-check individually

- **FlowButton** — the violet→cyan gradient becomes violet→teal. White label must clear
  4.5:1 at **both** ends. This exact check caught a 1.81:1 failure in the dark build.
- **ConfidenceBadge** — the amber tier needs a light-ground equivalent. The low-confidence
  sentence must stay legible; it carries the product's honesty.
- **Auth panel** — the gradient panel over a paper page. Re-check white-on-gradient at
  both ends, and whether the scrim is still needed or now hurts.
- **MatchBar** — track on `--surface-2`, fill in the gradient. Ensure the fill is
  distinguishable from the track at 3% width, the smallest real value on the results page.
- **Kicker** — `--violet-ink`, not `--violet-lt`.
- **Focus rings** — must be visible against paper. The dark theme's `--violet-lt` ring
  will nearly vanish; use `--violet` or `--violet-ink`.

## 6. What does not change

Instrument Serif and Inter. The editorial layout and generous space. `[ bracketed ]`
kickers. The stagger spec (§5b). The sliding auth panel (§5c). Breakpoints. **No grids or
box patterns** — still rejected. The monospace-for-numerals rule — Instrument Serif's
old-style `1` reads as a lowercase `l`, which shipped as a real bug.

## 7. Rename: Quiz → Questions

The route becomes `/questions`, with a **301 from `/quiz`** so existing links survive.
Update the auth guard in `proxy.js`, `robots.txt`, the sitemap, and every visible string.
`lib/i18n/en.js` holds the copy; the `quiz` object key may stay for code stability, but no
user-visible string may read "quiz".
