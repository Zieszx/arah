# ARAH — Post-SPM Pathway Finder

**Design spec** · 2026-07-28

---

## 1. Purpose

Malaysian SPM leavers choose a pre-university course and a field of study with almost
no evidence to go on. ARAH asks a student about their results, interests, preferred
tasks and personality, then predicts which fields of study students like them actually
chose — using a model trained on 207 real alumni responses.

The product is not a careers quiz with hand-written rules. Every recommendation is
produced by a scikit-learn model fitted to the survey data, and every result is
explainable in terms of the alumni it was derived from.

---

## 2. What the data says

Source: `Post-SPM Academic Pathway and Interest Survey.csv`, 207 complete responses,
19 questions, 10 fields of study, 13 states, SPM cohorts 2019–2024. No missing records.

Findings that shape the product:

| Finding | Number | Consequence for the design |
|---|---|---|
| Students are dissatisfied | 27% rated satisfaction 1–2 of 5 | The problem the product exists to reduce |
| Motive predicts satisfaction | Passion 4.38/5 (5% dissatisfied) vs family expectation 2.66/5 (57%) vs peers (65%) | The quiz must surface interest-fit, never popularity or parental pressure |
| Stream-matching is a myth | Related to SPM stream: 32% dissatisfied. Unrelated: 19% | Never filter or gate recommendations by SPM stream alone |
| Grades barely matter | SPM results = 5.7% of model importance; traits + tasks + interests = 55% | Lead the UI and marketing with personality and interest, not grades |
| Two fields are thin | Creative Art n=9, Humanities n=7 | Show these with an explicit low-confidence badge |

Measured model performance. **Repeated stratified cross-validation — 5 folds × 5
repeats, 25 fits** — on all 207 rows:

| Model | Top-1 | Top-3 |
|---|---|---|
| Random guess | 10.0% | 30.0% |
| Baseline: most popular | 21.3% ± 0.0 | 47.8% ± 0.0 |
| Random Forest alone | 36.1% ± 1.9 | 69.0% ± 2.0 |
| **Soft-voting ensemble (chosen)** | **34.8% ± 1.8** | **70.0% ± 1.5** |

The ensemble is KNN + Logistic Regression + Random Forest + Bernoulli Naive Bayes,
weighted `[2, 2, 1, 1]`, soft voting.

**Correction — read before quoting any number.** An earlier single-seed 5-fold run
reported 74.4% top-3. That figure is not reproducible: on n = 207 a single split swings
about ±3 points with the seed, and 74.4% sits outside the range repeated CV produces
(68.1–71.5%). The honest headline is **≈70% top-3**, which is still 2.3× random and
1.46× the most-popular baseline. All accuracy claims — in the product, the deck, and
marketing — use the repeated-CV mean. Single-seed scores are never quoted.

---

## 3. Scope

**In scope (this build):**

| Route | Purpose |
|---|---|
| `/` | Landing page — the pitch, the findings, the CTA |
| `/signup`, `/login` | Supabase email + password auth |
| `/quiz` | Guided questionnaire, one question per screen |
| `/results/[id]` | Ranked predictions with match bars and alumni context |
| `/explore` | Browse all 10 fields of study |
| `/explore/[field]` | One field in depth, backed by survey aggregates |
| `/contribute` | Alumni submit their own outcome — grows the training set |

Plus a scheduled retraining job that refits the model as contributions arrive.

**Out of scope:** Google OAuth (deferred until credentials are provided), Bahasa Melayu
translation (architecture supports it; copy is English-only for v1), university or
scholarship listings, employer or salary data, admin moderation UI beyond a
`verified` flag.

---

## 4. Decisions locked

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js App Router, JSX (not TSX) | As requested |
| Hosting | Vercel | Already linked (project `arah`) |
| Database & auth | Supabase Postgres + Supabase Auth | Already provisioned, credentials pulled |
| Auth method | Email + password | No external setup blocks the build; Google added later |
| Styling | Tailwind CSS + shadcn/ui + Magic UI | PrimeFlex dropped — it collides with Tailwind |
| Data tables | PrimeReact DataTable, `/explore` only, CSS-scoped | Genuinely better than hand-rolling a sortable table |
| Charts | Recharts | React-native API, composes with the theme |
| Motion | GSAP + ScrollTrigger, Motion, Lenis | As requested |
| ML training | pandas, NumPy, scikit-learn, joblib — offline | As requested |
| ML serving | Python function on Vercel, same project | Real scikit-learn; one repo, one deploy, one domain |
| Language | English, routed through `lib/i18n/en.js` | BM can be added without touching components |

### Visual direction

Editorial layout (Valeran reference) with an ink-black / violet / cyan palette.

```
--ink        #08070F   page ground
--surface    #12101D   cards, panels
--violet     #7C3AED   primary accent
--violet-lt  #A78BFA   labels, kickers
--violet-pl  #C4B5FD   sand grains, links
--cyan       #22D3EE   secondary accent, gradient partner
--text       #EFEDFA   body text
--muted      rgba(239,237,250,.62)
```

Display face **Instrument Serif**, body **Inter**, both self-hosted via `next/font`
(no external font requests, no layout shift). Micro-labels use the `[ bracketed ]`
motif from Valeran. Buttons are pill-shaped with a sliding arrow, after the 21st.dev
FlowButton.

No grid or box patterns anywhere in the background — explicitly rejected.

### Motion configuration (user-tuned, exact)

```js
// lib/motion/config.js
export const SAND = {
  speed: 0.03,        // velocity multiplier off cursor movement
  settle: 0.97,       // per-frame friction
  trailDecay: 0.003,  // life lost per frame (~5.5s grain lifetime)
  grainsPerMove: 10,
  maxGrains: 1400,
};
export const SPOTLIGHT = { size: 100 };   // px radius, follows cursor
export const FIELD = {
  drift: 0.20,        // particle field speed
  density: 7000,      // 1 particle per N px² — raised ~55% from default
  linkDistance: 62,
};
```

Behaviour: brushed scatter — grains fly off in the direction of travel then decelerate.
Slow, long-gliding, long-lived, over a dense particle field with a 100px cursor spotlight.

---

## 5. Architecture

Four layers, one Vercel deployment.

```
Browser
  └── Next.js App Router (JSX)          components, animation, forms
        └── Route handlers (/app/api)   auth, validation, persistence
              ├── Supabase Postgres     data + RLS
              └── Python fn (/api/ml)   scikit-learn inference
```

```
arah/                                  ← repo root (github.com/Zieszx/arah)
├── vercel.json                        ★ Vercel Services config (see below)
├── app/
│   ├── layout.jsx                     fonts, providers, Lenis, cursor layer
│   ├── page.jsx                       landing
│   ├── (auth)/login/page.jsx
│   ├── (auth)/signup/page.jsx
│   ├── quiz/page.jsx
│   ├── results/[id]/page.jsx
│   ├── explore/page.jsx
│   ├── explore/[field]/page.jsx
│   ├── contribute/page.jsx
│   └── api/
│       ├── quiz/route.js              POST answers → predict → persist
│       ├── fields/route.js            aggregates for /explore
│       └── contribute/route.js        POST alumni outcome
├── services/ml/                       ← the "ml" Vercel Service
│   ├── index.py                       ASGI app: GET health, POST predict
│   ├── encode.py                      shared encoder, stdlib only
│   ├── requirements.txt               scikit-learn, numpy, joblib
│   ├── .python-version                3.13
│   ├── model.joblib                   2.7 MB, committed
│   └── feature_spec.json              ★ single source of truth
├── ml/
│   ├── train.py                       pandas → sklearn → joblib
│   ├── parity_fixtures.json           JS/Python encoding contract
│   └── data/survey.csv
├── components/{ui,magic,motion,quiz,results,layout}/
├── lib/
│   ├── supabase/{client,server,middleware}.js
│   ├── i18n/en.js
│   ├── motion/config.js
│   └── features.js                    reads services/ml/feature_spec.json
└── docs/superpowers/specs/
```

### Why Vercel Services, not `/api/*.py`

The original design placed Python files in `/api` beside Next.js, on the older Vercel
pattern where that routed automatically. **It does not on current Vercel.** A deploy
proved it: dependencies installed and bytecode compiled, but Next.js owned every route
and `/api/ml/predict` returned a Next.js 500. The docs are explicit — *"To deploy a
Python API alongside a frontend such as a Next.js app within the same project, use
Services."*

```json
{
  "services": {
    "web": { "root": "./", "framework": "nextjs" },
    "ml":  { "root": "services/ml/", "entrypoint": "index:app" }
  },
  "rewrites": [
    { "source": "/api/ml/(.*)", "destination": { "service": "ml" } },
    { "source": "/(.*)",        "destination": { "service": "web" } }
  ]
}
```

Three constraints this imposes, all learned from failed deploys:

1. **`entrypoint` is required** for a Python service, and must name a **callable ASGI
   app** (`index:app`). The `BaseHTTPRequestHandler` + `handler` class convention belongs
   to the legacy `/api/*.py` mode and is rejected here.
2. **Each service builds from its own `root`.** `model.joblib`, `feature_spec.json`,
   `requirements.txt` and `.python-version` must all live inside `services/ml/` — a
   version pin at the repo root is silently ignored (the build falls back to 3.12).
3. With `services` present, top-level build keys (`functions`, `buildCommand`, …) are
   invalid; they move into the service. `memory` is ignored entirely under Active CPU
   billing.

The ASGI app is written against the raw ASGI protocol with **no framework dependency** —
the bundle is already 244 MB with scikit-learn and scipy.

### The encoding contract

The quiz UI and the Python encoder must agree exactly on which features exist, their
order, and their allowed values. If they drift, nothing crashes — predictions silently
become wrong. This is the single largest correctness risk in the project.

Mitigation: `ml/feature_spec.json` is **generated by `train.py`** and is the only place
feature definitions live.

```json
{
  "version": "2026-07-28",
  "n_features": 55,
  "groups": [
    { "key": "stream",      "type": "multi",  "max_select": 2, "options": ["Science (Biology, Chemistry etc)", "..."] },
    { "key": "enjoyed",     "type": "multi",  "max_select": 3, "options": ["..."] },
    { "key": "difficult",   "type": "multi",  "max_select": 3, "options": ["..."] },
    { "key": "tasks",       "type": "multi",  "max_select": 2, "options": ["..."] },
    { "key": "traits",      "type": "multi",  "max_select": 3, "options": ["..."] },
    { "key": "personality", "type": "single", "options": ["Introvert", "Extrovert", "Ambivert"] },
    { "key": "results",     "type": "single", "options": ["..."] },
    { "key": "preu",        "type": "single", "options": ["..."] },
    { "key": "school",      "type": "single", "options": ["..."] },
    { "key": "speaking",    "type": "num",    "min": 1, "max": 5 }
  ],
  "classes": ["Business & Management (Accounting, Finance, Marketing etc)", "..."]
}
```

- `lib/features.js` imports it to render quiz options and validate submissions.
- `api/ml/predict.py` loads it from the joblib bundle to build the feature vector.
- A test asserts the JS-built vector equals the Python-built vector for identical answers.

Options appearing fewer than 5 times in the survey are dropped at training time (they
are free-text noise, e.g. `"Sejarah, bahasa melayu, bahasa inggeris"`), so the spec
contains only options the model was genuinely trained on.

### The pre-university problem

The survey asked alumni *"which pre-university program did you take?"* — a question they
could answer because they had already taken one. It carries real signal: 11.4% of model
importance, and STPM predicts Science & Mathematics at ×10.1 lift.

But ARAH's user is a student who has **not chosen yet**. For many of them the honest
answer is "I don't know". Asking it as a required question would either block them or
force a guess that corrupts their own prediction.

Resolution:

1. The question is asked as *"Which pre-U route are you leaning towards?"* with an
   explicit **"Not sure yet"** option, and it is the last question, not the first.
2. When "Not sure yet" is selected, the Python function **marginalises** over it: it
   builds one feature vector per pre-U option, runs `predict_proba` on each, and returns
   the average weighted by each option's frequency in the training data.
3. The response records `marginalised: true` so the results page can say *"based on all
   pre-U routes — tell us your route to sharpen this"*, with a one-click re-run.

This turns a blocking question into an optional refinement, and is strictly more correct
than imputing a single most-common value.

### Quiz length

Ten feature groups means **ten questions**, not eight. Any marketing copy claiming a
different number must be corrected — including the prototype hero text in
`docs/design/prototypes/`, which says "Answer 8 questions".

Presented as ten screens, grouped:
*about you* (school type, SPM results, stream) → *what you like* (subjects enjoyed,
subjects hard, tasks, traits, personality, public speaking) → *where you're heading*
(pre-U route, optional).

---

## 6. Data model

```sql
alumni_profiles          -- training data: 207 seed rows + contributions
  id, gender, spm_year, state, school_type,
  streams text[], spm_results, subjects_enjoyed text[], subjects_difficult text[],
  personality, tasks_enjoyed text[], characteristics text[], public_speaking int,
  preu_program, field_of_study, reasons text[], stream_related bool,
  satisfaction int, advice text,
  source text,            -- 'survey_2025' | 'user_contributed'
  verified bool default false,
  created_at timestamptz

profiles                 -- id → auth.users(id), display_name, created_at
quiz_responses           -- id, user_id, answers jsonb, created_at
predictions              -- id, quiz_response_id, results jsonb, model_version, created_at
fields                   -- slug, name, blurb, sample_size, avg_satisfaction, common_preu[]
```

`predictions.results` shape:

```json
{
  "ranked": [
    { "field": "Computer Science, Software & Data", "probability": 0.754, "confidence": "high", "alumni_count": 35 },
    { "field": "Business & Management", "probability": 0.203, "confidence": "high", "alumni_count": 44 }
  ],
  "model_version": "2026-07-28"
}
```

**RLS:**
- `quiz_responses`, `predictions`, `profiles` — owner-only read and write.
- `alumni_profiles` — no direct client read. Aggregates are exposed through
  `SECURITY DEFINER` views only, so free-text advice and rare demographic combinations
  can't be used to re-identify a respondent.
- `contribute` inserts land with `verified = false` and are excluded from training
  until flipped.

---

## 7. Flow

**Quiz → results**

1. Answers held in React state, mirrored to `localStorage` so a refresh or a dropped
   connection doesn't lose progress.
2. `POST /api/quiz` — authenticated; zod-validated against `feature_spec.json`.
3. Route handler inserts `quiz_responses`, then calls `/api/ml/predict`.
4. Python function encodes, runs `predict_proba`, returns ranked classes.
5. Route handler annotates each result with `alumni_count` and a confidence tier,
   inserts `predictions`, returns the id.
6. Redirect to `/results/[id]` — a server component that reads the prediction and joins
   the alumni aggregates for display.

Predictions are stored, not recomputed, so a shared results link is stable.

**Confidence tiers** (from training-set size for the predicted class):
`high` ≥ 20 · `medium` 10–19 · `low` < 10 (Creative Art, Humanities). Low renders an
explicit badge: *"Only 9 students in our data chose this — treat it as a lead, not a
recommendation."*

**Retraining:** a Vercel cron hits a protected route that exports verified
`alumni_profiles`, runs `train.py`, and writes a new `model.joblib` and
`feature_spec.json`. Because retraining can change the feature set, the model version is
stored on every prediction and old predictions are never re-interpreted under a new spec.

---

## 8. Error handling

| Failure | Behaviour |
|---|---|
| ML function timeout or 5xx | One retry, then a friendly error. Answers are already persisted, so the student retries without re-answering. |
| Cold start latency | Model cached in a module-level global; Fluid Compute keeps instances warm. |
| Invalid quiz payload | 422 with the offending field; client scrolls to that question. |
| Feature-spec mismatch between client and model | Startup assertion in the Python function; fails loudly rather than predicting on a misaligned vector. |
| Supabase unreachable | Error boundary with a retry; no partial writes (single transaction per submission). |
| Unauthenticated POST | 401, redirect to `/login` with a return path. |

---

## 9. Accessibility and performance

- All motion is disabled under `prefers-reduced-motion`: no sand, no particle drift,
  spotlight becomes a static glow.
- The sand cursor is pointer-only. Touch devices never render it and keep the native
  cursor behaviour.
- The particle field pauses when off-screen (IntersectionObserver) and when the tab is
  hidden, and drops density on small viewports.
- Particle linking uses a spatial hash grid rather than the O(n²) pair loop — same
  visual result, materially less CPU on low-end Android, which much of the audience uses.
- Canvas layers are `aria-hidden` and never trap focus.
- Quiz is fully keyboard navigable; each question is a labelled fieldset with a live
  progress announcement.
- Contrast: `--text` on `--ink` and `--violet-lt` on `--surface` both meet WCAG AA.
- Breakpoints: 320, 390, 768, 1280, 1920.

---

## 10. Testing

| Layer | Tool | What it covers |
|---|---|---|
| Feature encoding | Vitest + pytest | **Parity test** — same answers produce an identical vector in JS and Python |
| Model | pytest | Repeated-CV top-3 stays above the 66.0% floor, and the score is a repeated estimate rather than a single seed |
| API routes | Vitest | Validation, auth guards, confidence tiering, retry path |
| Components | Vitest + Testing Library | Quiz navigation, results rendering, reduced-motion fallbacks |
| E2E | Playwright | signup → quiz → results, at 390px and 1280px |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Feature drift between UI and model | Single generated `feature_spec.json` + parity test |
| Thin classes produce confident-looking nonsense | Confidence tiers and an explicit low-confidence badge |
| Canvas drains battery on low-end phones | Spatial hash, off-screen pause, density scaling, reduced-motion opt-out |
| Python cold start feels slow | Module-global model cache; skeleton state on the results page |
| Contributions poison the training set | `verified = false` by default; excluded from training until reviewed |
| 207 rows is a small dataset | Stated plainly in the UI; the give-back loop is the growth path |
| Users can't answer the pre-U question | "Not sure yet" option + marginalisation (§5) |
| Seed/demo credentials leaking into git | Held in `.env.seed.local`, matched by the `.env*` ignore rule; verified with `git check-ignore` |

---

## 12. Open items

None blocking. Deferred by decision: Google OAuth (needs client credentials),
Bahasa Melayu copy, and a moderation UI for verifying contributions — for now
`verified` is flipped directly in Supabase.
