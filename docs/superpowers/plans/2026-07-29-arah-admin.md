# ARAH Admin — Implementation Plan (5 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A sidebar-navigated admin area where the client can browse the 207 survey responses, inspect real student submissions, moderate contributions, and poke at the algorithm directly — proving to their own client that the model works.

**Architecture:** A route group `app/(admin)/` with its own layout carrying a persistent sidebar. Every route is gated server-side on `profiles.is_admin`, backed by RLS policies so the database refuses even if a route check is ever bypassed. Data is read through server components; the algorithm tester posts to the existing ML service.

**Tech Stack:** Next.js 16.2.12 (App Router, JSX), React 19.2.4, Supabase, Tailwind v4, Recharts, PrimeReact DataTable (scoped to this area only), the ARAH component kit.

## Global Constraints

- **JSX, never TSX.** No `.ts`/`.tsx`, no `tsconfig.json`.
- **Next.js 16 / React 19 are newer than model training data.** Read `node_modules/next/dist/docs/01-app/` before writing App Router code.
- **Tailwind v4** — `@theme` in `app/globals.css`, no `tailwind.config.js`.
- **Defence in depth on access.** Every admin route checks `is_admin` server-side **and** the data is protected by RLS. Neither alone is sufficient. There must be no code path by which a user grants themselves `is_admin`.
- **Never trust a client-side role check.** Hiding the UI is not access control.
- **Contrast:** `--color-violet` `#7C3AED` on ink is 3.52:1 — large text, borders and fills only. Body text uses `--color-violet-lt` (7.4:1).
- **`--chart-1..5`** are the chart palette; `chart-1`/`chart-2` are a deliberate cool/warm doublet for colour-blind separation. Use them in that order for series.
- Reduced motion and touch honoured via `useMotionCapability()`. Never early-return before all hooks run.
- Never commit secrets. `git ls-files | grep -Ei '\.env|\.vercel'` must return nothing.
- Repo root `E:\Barang Barang\.PersonalWork\Freelance\Nuha\arah\arah`, branch `main`.

## Responsive requirement — applies to every screen in this plan

Admin is used on a laptop most of the time, but must work properly on a phone and an iPad. Verify **by screenshot**, not assumption, at all five widths:

| Width | Device | Sidebar behaviour |
|---|---|---|
| **320px** | small phone | off-canvas drawer, hamburger toggle, full-width content, tables become stacked cards |
| **390px** | phone | as above |
| **768px** | iPad portrait | off-canvas drawer; content uses a two-column grid where sensible |
| **1280px** | laptop | sidebar pinned open at 240px, content fills the rest |
| **1920px** | large desktop | sidebar pinned; content capped at ~1440px and centred so lines never run absurdly long |

No horizontal scrollbar at any width. Tables must never force the page wider than the viewport — they scroll inside their own `overflow-x: auto` container, or reflow to cards below 768px. Touch targets ≥44×44px.

## The design bar

This is client-facing when they demo it. It must look as considered as `/demo`.

- Compose from the existing kit — `FlowButton`, `Kicker`, `MatchBar`, `ConfidenceBadge`, shadcn primitives. Do not invent a second button style.
- Ink ground, Instrument Serif headings, Inter body. Violet leads, cyan supports.
- **No grids, no box patterns** — rejected by the client by name.
- Data density is the goal here, not airiness — but keep 16px minimum body text and generous row height. An admin table crammed to 11px is not "powerful", it is unreadable.
- Every control has hover, focus-visible, active and disabled states. Transitions 150–250ms.
- Empty states are designed, never a bare "No data". Say what will appear here and why it is empty.

---

## Task 1: Admin shell and the sidebar

**Files:** `app/(admin)/layout.jsx`, `components/admin/{AdminSidebar,AdminHeader}.jsx`, `lib/auth/requireAdmin.js`

- [ ] `requireAdmin()` — a server helper that loads the session, reads `profiles.is_admin`, and `redirect()`s non-admins to `/` (not to `/login` — a signed-in student should not be invited to try). Every admin page calls it. Returns the profile so pages need not re-query.
- [ ] `AdminSidebar` — persistent nav: **Overview · Survey Data · Student Responses · Contributions · Algorithm Tester**. Active route highlighted with a violet left-edge marker. Pinned at ≥1280px, off-canvas drawer below with a hamburger toggle, a backdrop, focus trapped while open, `Esc` to close, and focus returned to the toggle on close.
- [ ] `AdminHeader` — breadcrumb, the signed-in admin's name, a link back to the student site, sign out.
- [ ] **Verify:** a non-admin signed-in user hitting `/admin` is redirected and the response body contains none of the admin markup. Screenshot all five widths.

---

## Task 2: Overview

**Files:** `app/(admin)/admin/page.jsx`, `components/admin/StatCard.jsx`

Stat cards: total alumni (207), students registered, quizzes completed, predictions issued, pending contributions. Plus a Recharts bar of the field distribution using `--chart-1..5`, and the model card: version, top-3 accuracy **both paths** (69.1% with a stated pre-U route, 62.8% marginalised), the 49.3% naive baseline, and n=207.

**State the two accuracy figures side by side.** A single number invites the client to quote the flattering one; this is the screen that keeps them honest.

Empty states designed for the counts that are legitimately zero today.

---

## Task 3: Survey data browser

**Files:** `app/(admin)/admin/survey/page.jsx`, `components/admin/SurveyTable.jsx`

All 207 alumni rows, searchable and sortable, using PrimeReact `DataTable` — **with its CSS scoped to this route only** so it cannot leak into the Tailwind theme elsewhere. Columns: field of study, stream, results band, pre-U, satisfaction, and the free-text advice.

Below 768px the table reflows to stacked cards; it never widens the page.

**This is the one screen that exposes free-text advice.** It is reachable only by an admin, only through RLS-backed policies. Add a one-line notice at the top: *"These are real students' words. Do not republish them attributed."*

---

## Task 4: Student responses

**Files:** `app/(admin)/admin/responses/page.jsx`, `app/(admin)/admin/responses/[id]/page.jsx`

List of submitted quizzes: when, which student, whether it marginalised, the top predicted field. Detail view shows all ten answers beside the ranked prediction they received.

Include a **"disagreements"** filter — submissions where the student later contributed a different outcome than the model's top pick. That is the most valuable data in the system for improving the model, and nothing else surfaces it.

Respect the data policy from Plan 3: this is personal data, shown to admins for support. Do not add an export-to-CSV button — quiet bulk egress of student data is exactly what the signup notice promises does not happen.

---

## Task 5: Contribution moderation

**Files:** `app/(admin)/admin/contributions/page.jsx`, `app/api/admin/contributions/route.js`

Queue of `alumni_profiles` rows with `verified = false`. Each shows the full submission with approve and reject actions. Approving sets `verified = true`, which admits it to `field_stats` and the next retrain.

**Guard rails:** the mutation route re-checks `is_admin` server-side; approval is logged with who and when; rejection soft-deletes rather than hard-deletes so a mistake is recoverable.

Show the current effect on the dataset: *"Approving this makes Creative Art n=10, which would lift it above the suppression threshold."* That consequence is invisible otherwise and directly affects what students are shown.

---

## Task 6: Algorithm tester

**Files:** `app/(admin)/admin/test/page.jsx`, `components/admin/AlgorithmTester.jsx`

A form rendering all ten questions from `feature_spec.json` — never hardcoded — posting to the ML service and showing the raw result: all ten ranked fields with probabilities, `marginalised`, `model_version`, and the nearest alumni that drove it.

Include preset buttons for the two documented demo students (the technical-stream student who should rank Computer Science first; the arts-stream student who should rank Creative Art first) so the client can demonstrate it in one click.

Show a **"what changed"** diff when a single answer is altered — the clearest possible demonstration that the model is responding to inputs rather than guessing.

**Verify:** the technical-stream preset returns Computer Science first, matching the recorded 66.4%.

---

## Task 7: Admin end-to-end

**Files:** `tests/e2e/admin.spec.js`

Playwright: a non-admin is redirected from `/admin`; an admin sees all five sections; the sidebar drawer opens, traps focus and closes on `Esc` at 390px; the algorithm tester returns a ranking. Run at 390px and 1280px.

Plus a security test asserting that a signed-in non-admin receives **no admin markup** in the response body, and that `POST /api/admin/contributions` returns 403 for them.

---

## Self-Review

**Spec coverage.** All four areas the client selected are covered: survey data (Task 3), student responses (Task 4), moderation (Task 5), algorithm tester (Task 6), plus the overview they did not ask for but which makes the rest navigable. Sidebar navigation → Task 1. Responsive at five widths → every task, verified by screenshot.

**Type consistency.** `requireAdmin()` returns the profile and is called identically across Tasks 2–6. `feature_spec.json` drives Task 6 exactly as it drives the student quiz in Plan 3, so the two can never diverge. `field_stats` columns match migration 0002 including `suppressed`.

**Risk.** PrimeReact CSS leaking beyond `/admin/survey` is the main hazard; scope it and verify by checking that `/demo` is pixel-identical before and after.
