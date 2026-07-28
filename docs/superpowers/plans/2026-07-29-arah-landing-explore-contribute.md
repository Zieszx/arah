# ARAH Landing, Explore & Contribute — Implementation Plan (4 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public face of ARAH — a landing page that earns a student's trust in ten seconds, an explorable view of all ten fields backed by real survey data, and the give-back loop that grows the dataset.

**Architecture:** Server components reading `field_stats` (the aggregate-only, k-anonymised view). GSAP ScrollTrigger drives the landing narrative. Contributions insert with `verified = false` so they cannot influence results until an admin approves them in Plan 5.

**Tech Stack:** Next.js 16.2.12 (App Router, JSX), React 19.2.4, Supabase, Tailwind v4, GSAP + ScrollTrigger, Motion, Recharts, the ARAH component kit.

## Global Constraints

- **JSX, never TSX.** No `.ts`/`.tsx`, no `tsconfig.json`.
- **Next.js 16 / React 19 are newer than model training data.** Read `node_modules/next/dist/docs/01-app/` before writing App Router code.
- **Tailwind v4** — `@theme` in `app/globals.css`, no `tailwind.config.js`.
- **Never fabricate a statistic.** `field_stats` returns `suppressed = true` with NULL aggregates for fields under n=10 (Creative Art 9, Humanities 7). Render the sample size and say statistics are withheld. Never show 0, "—" without explanation, or an imputed value.
- **Contributions are `verified = false` on insert.** No client-supplied value may set it true.
- **Contrast:** `--color-violet` on ink is 3.52:1 — large text, borders, fills only. Body uses `--color-violet-lt`.
- **`--chart-1..5`** for all series, in order; `chart-1`/`chart-2` are the colour-blind-safe cool/warm doublet.
- Reduced motion and touch honoured via `useMotionCapability()`. GSAP must be gated too — the CSS media block does not stop it.
- Never commit secrets. `git ls-files | grep -Ei '\.env|\.vercel'` must return nothing.
- Repo root `E:\Barang Barang\.PersonalWork\Freelance\Nuha\arah\arah`, branch `main`.

## Responsive requirement — every screen, verified by screenshot

**320 · 390 · 768 · 1280 · 1920.** No horizontal scrollbar at any width. Charts scroll inside their own container or reflow; they never widen the page. Touch targets ≥44×44px. At 1920 cap content at ~1440px so line lengths stay readable.

## The design bar

This is the first thing a student sees and the page the client will screenshot.

- Compose from the kit — `FlowButton`, `Kicker`, `MatchBar`, `ConfidenceBadge`, shadcn primitives. No second button style.
- Editorial: Instrument Serif headlines at 48–64px desktop, left-aligned, generous space. Section padding ~96px desktop / 56px mobile. Body ≤68 characters per line.
- Violet leads, cyan supports. Never equal weight.
- **No grids, no box patterns.** Rejected by the client by name.
- Motion is slow and weighted, matching the tuned sand physics. Nothing bounces.
- A student on a cheap Android over patchy data is the target user. Any flourish that costs legibility or battery goes.

---

## Task 1: Landing page

**Files:** `app/page.jsx`, `components/landing/{Hero,Finding,HowItWorks,Proof,Cta}.jsx`

Replace the holding page. The narrative, in order:

1. **Hero** — `[ 207 students before you ]`, *"Find the course that actually fits."*, one line of body copy, `FlowButton` → "Start the quiz". Left-aligned over the live particle field. This already exists at `/demo`; promote and refine it.
2. **The finding** — the strongest thing in the data, stated plainly: students who chose on passion report 4.38/5 satisfaction with 5% dissatisfied; those who chose for family expectation report 2.66/5 with 57% dissatisfied. **11× less regret.** One Recharts bar, `--chart-1`/`--chart-2`.
3. **How it works** — four steps: answer ten questions → matched against 207 alumni → ranked fields with confidence → explore what they chose and why.
4. **Proof** — both accuracy figures side by side (69.1% with a stated pre-U route, 62.8% without) against the 49.3% naive baseline, and n=207 stated. **Never show only the higher number.**
5. **CTA** — repeat the FlowButton with a one-line reassurance that it is free and takes about three minutes.

GSAP ScrollTrigger reveals each section on entry — **gated on `useMotionCapability()`**, and with all content present and readable when motion is off (never `opacity: 0` with no fallback; that is how reduced-motion users get a blank page).

**Verify:** with reduced motion enabled, every section is visible and readable on first paint. Screenshot all five widths.

---

## Task 2: Explore — index

**Files:** `app/explore/page.jsx`, `components/explore/FieldCard.jsx`

All ten fields as cards: name, sample size, average satisfaction, most common pre-U route, and a one-line description. Sorted by sample size descending.

**Suppressed fields must read honestly.** Creative Art (9) and Humanities (7) show the count and: *"Only 9 students in our data chose this — not enough to report satisfaction without risking identifying someone."* That sentence is doing two jobs: it is truthful about the statistics, and it tells the student why, which builds trust rather than looking broken.

Cards use `--surface`, 1px `--hairline`, and the scalloped concave-corner image mask from the Valeran reference as the one decorative motif.

---

## Task 3: Explore — field detail

**Files:** `app/explore/[field]/page.jsx`, `components/explore/{SatisfactionChart,CommonRoutes,AdviceQuotes}.jsx`

Per field: sample size, satisfaction distribution (Recharts, `--chart-1..5`), the pre-U routes those students took, the streams they came from, and **real advice quotes** from the survey's free-text answers.

**On the advice quotes — read this carefully.** These are real students' words. The raw `alumni_profiles` table is not client-readable by design. Expose quotes through a dedicated `SECURITY DEFINER` view that returns only the advice text, never alongside demographics that could re-identify. **Do not surface quotes for suppressed fields at all** — with n=7, a quote plus a field name narrows too far. Add a short attribution line: *"From students who took this path."*

Generate static params for the ten fields; 404 for anything else.

---

## Task 4: Contribute

**Files:** `app/contribute/page.jsx`, `app/api/contribute/route.js`, `components/contribute/ContributeForm.jsx`

The give-back loop — the only real path past 207 rows.

The form mirrors the original survey: the same ten predictive questions plus outcome fields (field of study, reasons, satisfaction, advice). Render questions from `feature_spec.json`; never hardcode.

**Server route:** authenticate; validate against the spec; insert into `alumni_profiles` with `source = 'user_contributed'` and **`verified = false` set server-side, ignoring any client value**. Return a thank-you state explaining that a human reviews it before it affects anyone's results — which is true, and sets the right expectation.

Frame the ask honestly: *"You've been through this. Tell us what you actually chose, and the next student gets a better answer."* Do not gamify it.

**Verify:** a submission lands `verified = false`; a crafted request setting `verified: true` is ignored; `field_stats` is unchanged until an admin approves. Commit.

---

## Task 5: The temporal-differencing fix — do this before Contribute ships

**Files:** `supabase/migrations/0006_field_stats_hardening.sql`

Plan 1's final review found a live privacy hole that activates the moment contributions start arriving:

> `avg_satisfaction` is rounded to 2dp, which at n≈17 pins the integer sum exactly. Polling `field_stats` before and after a single submission yields `sum_new − sum_old` = that individual's exact satisfaction score, with `pct_dissatisfied` confirming whether they were ≤2. The n≥10 threshold does not defend against this.

It is not exploitable today because the dataset is static. **Task 4 makes it exploitable.** Fix it in the same release, not later.

Mitigation — implement all three:
1. Round `avg_satisfaction` to **1dp**, widening the inference band.
2. Add deliberate **count banding**: report `sample_size` in buckets (10–19, 20–49, 50+) rather than an exact number, so a single new row does not visibly move the denominator.
3. Only refresh the exposed aggregates when at least **3** new verified rows have landed for a field since the last refresh, so no single submission is ever isolatable.

Document the reasoning in the migration. A future maintainer who "tidies up" the banding back to exact counts would silently reopen this.

**Verify:** insert one verified row and confirm the exposed aggregates do not move; insert three and confirm they do.

---

## Self-Review

**Spec coverage.** Landing → Task 1. Explore index and detail → Tasks 2–3. Contribute → Task 4. The deferred privacy fix from Plan 1's final review → Task 5, sequenced before Task 4 can do harm.

**Type consistency.** `field_stats` columns (`sample_size`, `avg_satisfaction`, `pct_dissatisfied`, `common_preu`, `suppressed`) are read identically in Tasks 1–3 and modified once in Task 5. `feature_spec.json` drives Task 4's form exactly as it drives the quiz in Plan 3.

**Ordering note.** Task 5 must merge before Task 4 is deployed. If they ship separately, Contribute goes live with a known re-identification channel open.
