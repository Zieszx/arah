# Plan 1 vs. everything we agreed

**Audit date:** 2026-07-28 · **Scope:** Plan 1 of 4 — Foundation & ML Engine

Plan 1 deliberately built the **engine, not the interface**. The visual system, the
pages and the student journey are Plans 2–4. Items below marked *deferred* are on
schedule, not slipping. Items marked *changed* are where reality forced a correction —
each says why.

Live: `https://arah-sand.vercel.app/api/ml/predict` (behind Vercel Authentication)

---

## 1. The client's four requirements

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | A website helping post-SPM students choose a path | **Engine done, UI in Plans 2–4** | Prediction service live; no screens yet |
| 2 | Ask about results, interests, subjects enjoyed, personality | **Met** | All 10 question groups encoded in `feature_spec.json`; 55 features |
| 3 | Run a prediction analysis | **Met** | scikit-learn soft-voting ensemble, live on Vercel |
| 4 | Show the closest match to what previous students chose | **Met** | Every prediction derives from the 207 alumni; probabilities traceable to them |

---

## 2. Your 26 requirements

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Next.js, JSX | **Met** | Next.js 16.2.12, zero `.ts`/`.tsx`, no `tsconfig.json` |
| 2 | Deploy on Vercel | **Met** | Live, production aliased to `arah-sand.vercel.app` |
| 3 | Supabase database via Vercel | **Met** | 5 tables, RLS on all, 207 rows seeded |
| 4 | Attractive, smooth, user-friendly | *Deferred — Plan 2* | Visual system locked in `docs/design/visual-design-system.md` |
| 5 | All screen sizes (320→1920) | *Deferred — Plan 2* | Breakpoints specified |
| 6 | Login page | *Deferred — Plan 3* | Supabase Auth wired; `nuhaaa` account created |
| 7 | Landing page | *Deferred — Plan 4* | |
| 8 | Animated background | *Deferred — Plan 2* | Particle field spec + working prototype |
| 9 | GSAP + GSAP animation | *Deferred — Plan 2* | |
| 10 | Motion | *Deferred — Plan 2* | |
| 11 | Lenis smooth scroll | *Deferred — Plan 2* | |
| 12 | Magic UI | *Deferred — Plan 2* | |
| 13 | PrimeReact | *Deferred — Plan 4* | Scoped to `/explore` tables only |
| 14 | PrimeFlex | **Dropped, with your approval** | Collides with Tailwind |
| 15 | shadcn/ui | *Deferred — Plan 2* | |
| 16 | **scikit-learn** | **Met** | Soft-voting ensemble: KNN + LogReg + RandomForest + BernoulliNB |
| 17 | **pandas** | **Met** | `ml/train.py` loading and cleaning |
| 18 | **NumPy** | **Met** | Feature matrix, marginalisation averaging |
| 19 | **joblib** | **Met** | 2.7 MB artefact, loaded by the live service |
| 20 | Charts | *Deferred — Plan 4* | Recharts chosen |
| 21 | "Decide the ML approach for me" | **Met, then corrected** | Python on Vercel — see §4 |
| 22 | Code in `arah` | **Met** | `github.com/Zieszx/arah`, 22 commits on `main` |
| 23 | Pitch deck before code | **Met** | `ARAH-Pitch.pptx`, 19 slides, corrected |
| 24 | Record everything discussed | **Met** | `PROJECT-RECORD.md`, this file, the SDD ledger |
| 25 | Perfect, no errors | **See §6** | 42 tests; 12 real defects caught and fixed |
| 26 | Add features if useful | **Met** | 8 additions — see `PROJECT-RECORD.md` §8 |

---

## 3. The visual system — locked, not yet built

Every visual decision from the brainstorm is recorded and unchanged. **None is
implemented yet**; that is Plan 2's entire scope.

| Decision | Locked value | Built? |
|---|---|---|
| Palette | Ink `#08070F`, violet `#7C3AED`, cyan `#22D3EE`, text `#EFEDFA` | Plan 2 |
| Display face | Instrument Serif | Plan 2 |
| Body face | Inter | Plan 2 |
| Background | Interactive particle field, density `area/7000`, drift `0.20` | Plan 2 |
| Cursor | Brushed scatter — speed `0.03`, settle `0.97`, trail `0.003`, 10 grains | Plan 2 |
| Spotlight | 100px, cursor-following | Plan 2 |
| Grids / boxes | **Rejected** — must not appear | n/a |
| Motion stack | GSAP + ScrollTrigger, Motion, Lenis | Plan 2 |
| Buttons | Pill with sliding arrow (21st.dev FlowButton) | Plan 2 |

Your tuned motion values are preserved verbatim in the design system and in five
runnable prototypes at `docs/design/prototypes/`. `sand-tuner.html` is the reference
implementation Plan 2 ports from.

---

## 4. The algorithms — what changed and why

**Delivered as agreed:** real scikit-learn, real pandas, real NumPy, real joblib. No
JavaScript reimplementation, no ONNX export, no mocking.

Three corrections were forced by evidence:

**a) Accuracy: 74.4% → 70.0% ± 1.5.** The original figure came from a single 5-fold
split with one random seed. Re-running at other seeds gave 72.9%, 68.6%, 68.1% — so
74.4% was the favourable draw, not the model's ability. Repeated CV (5 folds × 5
repeats, 25 fits) gives **70.0% ± 1.5**, range 68.1–71.5. Still 2.3× chance on top-3 and
3.5× on top-1. The deck, the spec and the record were all corrected, and a test now
fails the build if anyone reverts to single-seed scoring.

**b) Feature count: 56 → 55.** `Pass (Lulus)` appears once in the survey and is removed
by the ≥5 rule. The earlier count kept it because single-select columns were one-hot
encoded without the frequency filter.

**c) Architecture: `/api/*.py` → Vercel Services.** The original design put Python
beside Next.js in `/api`, the correct Vercel pattern historically. **It does not route on
current Vercel.** A real deploy proved it: dependencies installed, bytecode compiled,
build reported success — and `/api/ml/predict` returned a Next.js 500 because nothing
was routed to it. Corrected to Vercel Services; one repo, one deploy, one domain
preserved.

**Kept as designed:** pre-U marginalisation. When a student hasn't chosen a pre-U route,
the model predicts once per route and averages weighted by real frequency rather than
guessing. Verified live — `marginalised: true` in the production response.

---

## 5. What is actually live today

```
GET  https://arah-sand.vercel.app/api/ml/predict
  → {"status": "ok", "model_version": "2026-07-28"}

POST same endpoint, technical-stream student
  → Computer Science, Software & Data   66.4%
    Business & Management               22.3%
    Engineering                          3.2%
    marginalised: true
```

Database: 207 alumni rows, distribution matching the source exactly (Business 44,
Computer Science 35, Engineering 23, Architecture 20, Health 19, Media 18, Law 16,
Science & Maths 16, Creative Art 9, Humanities 7). RLS proven to deny anonymous reads
*and* writes. Aggregates suppressed below n=10.

---

## 6. On "perfect, no errors"

42 automated tests pass (21 Python, 21 JavaScript). More usefully, **12 real defects
were caught and fixed** during the build, most of them in the plan I wrote:

| Defect | How it would have failed |
|---|---|
| `Number(null) === 0` in the JS encoder | Silently — wrong vectors, wrong recommendations |
| `Number("") === 0` in the JS encoder | Silently — React inputs initialise to `""` |
| `Number([5]) === 5` in the JS encoder | Silently |
| `Number("") === 0` in the seed helper | Loudly — blocked by a `CHECK` constraint |
| Parity fixture passing by coincidence | Silently — a green test hiding a live bug |
| Column-drift guard covering 2 of 11 columns | Silently — training on misaligned data |
| Accuracy from a single seed | Silently — an unreproducible claim to a client |
| Probability tolerance arithmetically impossible | Loudly — failing test |
| `/api/*.py` not routing on Vercel | Loudly, but only on deploy |
| Public 500s leaking file paths | Never — information disclosure |
| No k-anonymity on small-sample fields | Never — slow privacy erosion |
| `__pycache__` dirtying the repo | Cosmetically |

Seven of those twelve would have produced **no error at all**. That is the honest
meaning of "no errors" for a system with a model in it: not that nothing throws, but
that the silent failures are the ones you have guards for.

---

## 7. Not yet done

Plans 2–4: the design system and motion layer; auth, quiz and results; landing,
explore, contribute and the retraining job. Deferred by decision: Google OAuth (needs
credentials), Bahasa Melayu copy, contribution moderation UI.
