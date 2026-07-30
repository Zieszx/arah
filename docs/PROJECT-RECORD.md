# ARAH — Project Record

**The single record of everything agreed for this project**, from the first message of
the session to now. Every requirement, finding, decision and rejected alternative.
If something was discussed, it is here.

Last updated: 2026-07-28

Companion documents:
- `README.md` — the system overview, stack and how to run it
- `docs/RETRAINING.md` — how a contribution reaches the model
- `docs/DATA-SOURCES.md` — where the data comes from, and what cannot be used
- `docs/design/visual-design-system.md` — visual system and decision trail
- `docs/design/prototypes/` — five working HTML prototypes
- `../ARAH-Pitch.pptx` — 19-slide client pitch deck

---

## 1. Sources of truth

| Source | Location | Status |
|---|---|---|
| Survey responses | `Post-SPM Academic Pathway and Interest Survey.csv` (207 rows) | Studied in full; basis of all findings |
| Survey instrument | [Google Form](https://docs.google.com/forms/d/1ZUn0gYgHB6sSR9ESiUIotjIXvC_q2BrjteJ1yBn6kzA/edit) | Verified — structure matches the CSV exactly |
| Client pitch deck | `ARAH-Pitch.pptx` | Delivered, 19 slides, QA'd |

**Form vs data — options that exist but are unused.** The form offers values the 207
responses barely or never contain:

| Question | In the form | In the data |
|---|---|---|
| Gender | Female, Male, **Other** | Male (108), Female (99) only |
| SPM results | 9+ A's … **Credit, Pass, Fail** | 1 single "Pass (Lulus)"; no Credit/Fail |
| Every question | **"Other" free-text** | Source of all noise, e.g. `"Sejarah, bahasa melayu, bahasa inggeris"` |

Consequence: a future user can legitimately select a value the model has never seen.
Handled by the unseen-value fallback in §7.

---

## 2. Requirements — from the client

Stated at the start of the session:

1. A website for post-SPM students to help them choose a path or course.
2. It asks the student about **results, interests, subjects they enjoy, personality**.
3. Those answers feed a **prediction analysis**.
4. It returns **the closest match to what previous SPM students chose**.

All four are met. Requirement 4 is met literally: the recommendation is derived from
the actual choices of the 207 alumni, and every result is traceable to them.

---

## 3. Requirements — from you (Nuha)

| # | Requirement | Status |
|---|---|---|
| 1 | Next.js, JSX | Locked |
| 2 | Deploy on Vercel | Project `arah` already linked |
| 3 | Supabase database (via Vercel) | Provisioned, credentials pulled |
| 4 | Attractive, smooth, user-friendly | Visual system locked |
| 5 | All screen sizes — small phone, phone, iPad, desktop, big desktop | 320 / 390 / 768 / 1280 / 1920 |
| 6 | Login page | Supabase email + password |
| 7 | Landing page | In scope |
| 8 | Animated background | Interactive particle field |
| 9 | GSAP + GSAP animation | Landing scroll storytelling |
| 10 | Motion | Quiz transitions, results bars |
| 11 | Lenis smooth scroll | Global |
| 12 | Magic UI | Particles, effects |
| 13 | PrimeReact | DataTable on `/explore`, CSS-scoped |
| 14 | PrimeFlex | **Dropped** — collides with Tailwind (you approved) |
| 15 | shadcn/ui | Core component layer |
| 16 | scikit-learn | Ensemble model, trained and validated |
| 17 | pandas | Data loading and cleaning |
| 18 | NumPy | Feature encoding |
| 19 | joblib | Model persistence, 2.7 MB artefact |
| 20 | Charts | Recharts |
| 21 | "Decide it for me" re: ML in Next.js | Python function on Vercel, same project |
| 22 | Code lives in `arah` | Repo root `Nuha/arah/arah` |
| 23 | Pitch deck before code | Delivered |
| 24 | Record everything discussed | This document |
| 25 | Perfect, no errors | See §9 |
| 26 | Add features if useful | See §8 |

---

## 4. What the data says

207 responses · 19 questions · 10 fields · 13 states · SPM 2019–2024 · zero missing records.

**Demographics.** 52% male / 48% female. Public school 53%, boarding 25%, private 14%,
religious 9%. Introvert 38% / extrovert 35% / ambivert 28%. Largest states: Selangor 44,
Melaka 26, KL 22.

**Fields chosen.** Business & Management 44 · Computer Science & Data 35 · Engineering 23
· Architecture 20 · Health & Medical 19 · Media & Communication 18 · Law 16 ·
Science & Maths 16 · Creative Art 9 · Humanities 7.

### The four findings that shaped the product

**1 — One in four students regret their choice.** 27% rated satisfaction 1–2 of 5
(55 of 207). Mean satisfaction 3.59.

**2 — Motive predicts satisfaction, more than anything else.**

| Reason for choosing | Mean satisfaction | Dissatisfied |
|---|---|---|
| Personal interest & passion (n=120) | 4.38 | 5% |
| Scholarship / university offer (n=37) | 3.86 | 14% |
| Salary potential (n=65) | 3.86 | 18% |
| Academic strength (n=87) | 3.78 | 23% |
| Job opportunities (n=104) | 3.71 | 20% |
| **Family expectation (n=83)** | **2.66** | **57%** |
| **Peers / friends (n=48)** | **2.48** | **65%** |

Choosing on passion means **11× less regret** than choosing for family.

**3 — "Stick to your SPM stream" is bad advice.** Students in a field *related* to their
stream: 3.45 mean, 32% dissatisfied. *Unrelated*: 3.80 mean, 19% dissatisfied. Switching
lanes after SPM is common (41%) and tends to work out better.

**4 — Grades are barely relevant.** Model importance: character traits 19.6%, SPM stream
13.9%, preferred tasks 13.2%, pre-U 11.4%, subjects enjoyed 11.0%, subjects hard 9.2%,
personality 5.9%, **SPM results 5.7%**, school type 5.1%, public speaking 5.1%.
Confirmed independently by permutation importance. Who you are ≈ 55%; what you scored ≈ 6%.

### Strongest single signals (lift over base rate)

STPM → Science & Maths ×10.1 · Technical/Engineering subjects → Architecture ×3.6 ·
Technology & Computing → Computer Science ×3.5 · Arts stream → Architecture ×3.3 ·
Matriculation → Engineering ×3.2 · "Creative" → Humanities ×3.2 ·
Accountancy subjects → Business ×2.9 · "Persuasive" → Law ×2.6

---

## 5. Machine learning — what was actually built and measured

A first pass used a hand-rolled weighted cosine kNN (LOOCV: 37.2% top-1, 60.4% top-3).
It was **replaced** once scikit-learn was available, because a proper ensemble measured
materially better.

Pipeline: pandas load → drop options occurring <5 times → `MultiLabelBinarizer` for
multi-select, `OneHotEncoder` for single-select, scaled numeric for public speaking →
**207 × 56 matrix**, 10 classes.

**Model selection — single-seed 5-fold CV.** Used to rank candidates against each other.
Reliable for ordering, not for quoting:

| Model | Top-1 | Top-2 | Top-3 |
|---|---|---|---|
| Random guess | 10.0% | 20.0% | 30.0% |
| Baseline: most frequent | 21.3% | 30.9% | 47.8% |
| Baseline: stratified | 12.1% | 21.3% | 38.6% |
| KNN cosine k=15 | 36.2% | 52.7% | 61.8% |
| KNN cosine k=25 | 35.3% | 52.2% | 63.3% |
| Logistic Regression | 34.3% | 57.0% | 67.1% |
| Bernoulli Naive Bayes | 36.2% | 57.0% | 71.0% |
| SVM (RBF) | 34.3% | 57.5% | 70.0% |
| Random Forest | 34.3% | 56.5% | 72.0% |
| Extra Trees | 31.9% | 57.5% | 72.5% |
| Gradient Boosting | 32.9% | 54.6% | 64.7% |
| **Soft-voting ensemble — CHOSEN** | 35.7% | 58.0% | 74.4% |

### Correction — the headline number was wrong

The 74.4% above came from **one** 5-fold split with `random_state=42`. On n = 207 a
single split swings roughly ±3 points with the seed. Re-measuring the chosen model at
other seeds gave 72.9%, 68.6% and 68.1% — so 74.4% was the favourable draw, not the
model's ability.

**Repeated stratified CV (5 folds × 5 repeats, 25 fits) — the number to quote:**

| Model | Top-1 | Top-3 | Range |
|---|---|---|---|
| **Soft-voting ensemble — CHOSEN** | **34.8% ± 1.8** | **70.0% ± 1.5** | 68.1 – 71.5 |
| Random Forest alone | 36.1% ± 1.9 | 69.0% ± 2.0 | 65.7 – 71.0 |
| Baseline: most frequent | 21.3% ± 0.0 | 47.8% ± 0.0 | — |

Chosen model: `VotingClassifier(soft)` over KNN(k=15, cosine, distance-weighted),
LogisticRegression(balanced), RandomForest(600, balanced_subsample),
BernoulliNB(α=0.5), weights `[2,2,1,1]`. Artefact 2.7 MB via joblib (compress=3).

**Honest headline: ~70% top-3** — **2.3×** random and **1.46×** the most-popular
baseline. Top-1 34.8% is **3.5×** random.

Two standing rules follow from this:

1. **Never quote a single-seed CV score.** `train.py` computes and stores a repeated-CV
   mean and standard deviation; a test asserts the stored score is a repeated estimate.
2. `ARAH-Pitch.pptx` still contains the 74.4% and "74%" figures and **must be
   regenerated** before it is shown again.

Also corrected at the same time: the feature count is **55, not 56**. `Pass (Lulus)`
occurs once in the survey and is removed by the ≥5 rule, so `results` contributes four
options. The earlier count kept it because single-select columns were one-hot encoded
without the frequency filter.

**Verified end-to-end.** Two demo students were run through the trained model:

- *Technical stream, Maths + Computing, data analysis, Analytical/Observant/Strategic,
  Introvert, 6–8 A's, Foundation* → Computer Science **75.4%**, Business 20.3%
- *Arts stream, Art/Humanities/Languages, creating + storytelling,
  Creative/Outgoing/Persuasive, Extrovert, 3–5 A's, Diploma* → Creative Art **28.9%**,
  Law 23.6%, Media 19.5%

### Known ML limitations — stated, not hidden

- Creative Art n=9, Humanities n=7. Surfaced with an explicit low-confidence badge.
- Data reflects what alumni *chose and felt*, not salaries or hiring demand.
- SPM results are self-reported bands, not subject grades.
- 207 rows is small. Said plainly in the UI; the give-back loop is the growth path.

---

## 6. Growing the dataset — research outcome

Researched per your instruction. **Finding: no public dataset can extend this training
set.** MOHE and OpenDOSM publish *aggregate* enrolment (students per institution type,
per field, per year) — never per-student rows carrying interests, traits and personality,
which is exactly what this model needs.

What public data *can* legitimately do:

1. **Prior correction.** The 207 sample's field distribution differs from the national
   one. National enrolment shares can re-weight predicted probabilities so they are
   calibrated to reality rather than to survey convenience sampling.
2. **Context on `/explore`.** Real national intake numbers per field give students a
   sense of scale the survey alone cannot.

**Explicitly rejected: synthetic data generation.** Generating fake students from the
existing 207 would amplify the sample's own biases while inflating apparent accuracy.
It would make the metrics look better and the product worse.

**The real growth path** is the `/contribute` loop: every real student who later reports
their outcome becomes a genuine training row.

Sources: [OpenDOSM](https://open.dosm.gov.my/data-catalogue/enrolment_school_district) ·
[MoHE Dashboard](https://www.mohe.gov.my/en/broadcast/dashboard-statistic) ·
[data.gov.my](https://archive.data.gov.my/data/en_US/organization/jabatan-perangkaan-malaysia?groups=pendidikan)

---

## 7. Technical decisions

| Decision | Choice | Why |
|---|---|---|
| ML serving | Python function on Vercel, same project | Real scikit-learn; one repo, one deploy, one domain. ONNX export rejected (RF/ensemble exports poorly); separate service rejected (second deploy, CORS, cost) |
| Feature contract | `ml/feature_spec.json`, generated by `train.py` | Prevents silent UI↔model drift — the project's largest correctness risk |
| Pre-U question | Asked last, with "Not sure yet" → **marginalisation** | Users haven't chosen yet; imputing a value would corrupt their prediction |
| Unseen values | Encode as all-zeros for that group + telemetry counter | Form allows Credit/Fail/Other that the model never saw |
| Prediction storage | Stored, never recomputed | Shared result links stay stable across retrains |
| Model versioning | `model_version` on every prediction | Retraining can change the feature set |
| Contributions | `verified = false`, excluded from training | Prevents poisoning |
| Alumni privacy | No direct client read; `SECURITY DEFINER` aggregate views only | Free-text advice + rare demographics could re-identify |
| Styling | Tailwind + shadcn + Magic UI; PrimeFlex dropped | Two utility-CSS systems would collide |
| Language | English, via `lib/i18n/en.js` | BM addable later without touching components |
| Auth | Email + password now, Google later | Nothing blocks the build |

---

## 8. Features added beyond the brief

Proposed and included:

1. **`/contribute` give-back loop** — turns users into training data. The only real path
   past 207 rows.
2. **Confidence tiers** — high ≥20, medium 10–19, low <10 samples, with a plain-language
   explanation on low.
3. **Pre-U marginalisation** — a statistically sound answer to "I don't know yet".
4. **Explainability** — every result traceable to the alumni behind it, e.g. *"8 of the
   15 students most like you studied Computer Science."*
5. **Answer persistence** — `localStorage` mirror so a refresh never loses progress.
6. **Prior calibration** — optional national-enrolment re-weighting (§6).
7. **Reduced-motion and touch fallbacks** — full experience without the canvas layers.
8. **Retraining job** — scheduled refit as verified contributions arrive.

---

## 9. "Perfect, no errors" — how that is enforced

Correctness on a system like this cannot be asserted; it has to be tested. What is in place:

| Guard | Catches |
|---|---|
| **Encoding parity test** (JS vector ≡ Python vector) | The silent-drift failure that would make every prediction wrong without erroring |
| **Model regression test** | A retrain that quietly degrades accuracy below the 66.0% floor, or reverts to a flattering single-seed score |
| **Startup spec assertion** in the Python function | Predicting on a misaligned vector |
| zod validation on every route | Malformed submissions |
| RLS on every table | Cross-user data access |
| Vitest + pytest + Playwright | Logic, model, and the signup→quiz→results journey |
| Error boundaries + one retry on ML timeout | Cold-start and transient failures |
| Reduced-motion / touch fallbacks | Unusable UI on low-end and assistive setups |

Being straight about it: the two failure modes that matter here are silent, not loud —
feature drift and a bad retrain. Both are covered by tests that fail the build, which is
the only meaningful form of "no errors" for a system with a model in it.

---

## 10. Infrastructure

| Item | Value |
|---|---|
| Repo | `github.com/Zieszx/arah`, branch `main`, **no commits yet** |
| Repo root | `E:\Barang Barang\.PersonalWork\Freelance\Nuha\arah\arah` |
| Vercel project | `arah` (`prj_WppoDisZqifKcRNSkIM8OnKVdIBu`) |
| Supabase | Provisioned; credentials in `.env.development.local` |
| Seed account | `nuhaaa` / `nuhaaa@arah.app`, password in `.env.seed.local` (gitignored, verified) |
| Node / Vercel CLI | v24.9.0 / 58.0.0 |

**Security notes.** `.gitignore` covers `.vercel` and `.env*`; verified via
`git check-ignore` that no secret is stageable. The seed password was shared in plaintext
chat — fine for a demo account, but it must not be reused elsewhere and should be rotated
before public launch.

---

## 11. Deferred

Google OAuth (needs client credentials) · Bahasa Melayu copy (architecture ready) ·
moderation UI for verifying contributions (`verified` flipped in Supabase for now) ·
university/scholarship listings · employer and salary data.

---

## 12. Session chronology

1. Studied the 207-row survey CSV; ran distribution, cross-tab and lift analysis.
2. Built and LOOCV-validated a weighted cosine kNN recommender.
3. Built the 19-slide client pitch deck; found and fixed a corrupt-file bug (zero-height
   rounded shape), two title/content collisions and a contrast failure; verified all
   slides by rendering them.
4. On your ML requirement, installed scikit-learn and benchmarked 10 models; the
   soft-voting ensemble won and replaced the kNN.
4b. During pre-flight of Plan 1, found the 74.4% headline was a single-seed artefact.
    Re-measured with repeated CV: **70.0% ± 1.5**. Corrected the spec, this record and
    the plan; the pitch deck still needs regenerating.
5. Chose the architecture: Python function on Vercel beside Next.js.
6. Resolved four scope questions: styling stack, full scope, English-only, email auth.
7. Discovered the linked repo and Vercel project at `arah/arah`.
8. Studied five design references; ran a visual brainstorm covering palette, background
   motion, cursor physics and typography.
9. Locked: Instrument Serif + Inter, ink-black/violet/cyan, interactive particle field,
   100px cursor spotlight, brushed-scatter sand cursor with your tuned values, no grids.
10. Wrote the design spec; self-review found the pre-U flaw and the "8 vs 10 questions"
    copy error.
11. Verified the Google Form matches the CSV; researched dataset growth.
12. Wrote this record.
