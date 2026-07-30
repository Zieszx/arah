# ARAH — a post-SPM pathway finder

A student answers ten questions. ARAH compares them against 207 real Malaysian
SPM leavers who already made the choice, and reports which fields students with
similar answers actually went into — with the sample size and confidence behind
each one.

**Live:** https://arah-sand.vercel.app

It says *"students like you chose this"*. It never says *"you should study
this"*, and that distinction is enforced in the copy, not just intended.

---

## What it does

| Route | Purpose |
| --- | --- |
| `/` | Landing page and the headline finding from the data |
| `/questions` | The ten questions, about three minutes |
| `/results/<id>` | Ranked fields, each with its sample and confidence |
| `/explore` | Every field, with the numbers behind it |
| `/explore/<field>` | One field in depth: satisfaction, routes, real advice |
| `/contribute` | Alumni give back their own outcome |
| `/admin` | Seven-section console, behind a role flag |

---

## Stack

| Layer | Technology |
| --- | --- |
| Language | JavaScript (JSX), Python 3.13, SQL |
| Framework | Next.js 16.2 (App Router), React 19.2 |
| Styling | Tailwind CSS v4, shadcn/ui, Radix, PrimeReact |
| Motion | GSAP, Motion, Lenis, custom canvas |
| Machine learning | scikit-learn, NumPy, pandas, Joblib |
| Data | Supabase Postgres with Row Level Security |
| Charts | Recharts |
| Testing | Vitest, pytest, ESLint, Playwright |
| Hosting | Vercel (two services: Next.js + a Python ASGI app) |

Tailwind v4 is configured CSS-first in `app/globals.css`; there is
**no `tailwind.config.js`**. Next 16 renamed `middleware.js` to `proxy.js`.

---

## How the prediction works

1. **Encode** — the ten answers become a 55-number vector. One encoder in
   Python (`services/ml/encode.py`), a mirror in JavaScript
   (`lib/features.js`), held in lockstep by `ml/parity_fixtures.json`.
2. **Compare** — the same encoding was applied to all 207 alumni, so a student
   and an alumnus are directly comparable.
3. **Vote** — four models each score every field and are averaged:
   K-nearest-neighbours (k=15, cosine), logistic regression, a 600-tree random
   forest, and Bernoulli naive Bayes. Equal weights.
4. **Marginalise** — a student who has not picked a pre-U route yet is
   predicted once per route and averaged, weighted by how common each route is.
   The uncertainty is carried through rather than guessed away.
5. **Rank** — fields ordered by probability, each carrying the sample it rests
   on.

### Accuracy

Top-3 accuracy — whether the student's actual field landed in their top three
— measured with repeated stratified cross-validation (5 folds × 5 repeats):

| | |
| --- | --- |
| With a stated pre-U route | **71.5%** |
| Without one yet | **63.7%** |
| Naive baseline (always name the three most popular fields) | 49.3% |

Both figures are published on the site, not just the flattering one. At n=207
the confidence interval is roughly ±6 points, so differences of one or two
points are noise. Re-measure with `python ml/measure_paths.py`.

---

## Privacy

The dataset is 207 teenagers, and the design treats it that way.

- **k-anonymity** — a field with fewer than 10 students publishes no
  statistics at all and says so plainly.
- **Count banding** — sample sizes appear as ranges (10–19, 20–49), never
  exact counts, so two pages cannot be subtracted from one another.
- **Refresh gating** — published aggregates only move once at least three rows
  have changed, closing a temporal-differencing attack.
- **Row Level Security** — a student can read only their own responses,
  enforced in Postgres rather than only in application code.
- **Privilege-level admin lock** — admin routes are gated in the app *and* the
  tables are locked by database grant.
- **The account is theirs** — a student changes their own display name, email
  and password from `/account`, each guarded by their current password.
  Deleting the account removes the responses and the predictions.
- **No password is ever readable** — not by an admin, not anywhere. There is
  also no reset-by-email link, because this system sends no email; changing a
  password requires knowing the current one.

---

## Running it locally

```bash
npm install
pip install -r requirements-dev.txt      # training + test toolchain

# Supabase credentials, in .env.local:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Apply `supabase/migrations/*.sql` in order to a fresh project, then:

```bash
npm run seed:alumni     # load the 207 survey rows
npm run seed:user       # create the demo account from .env.seed.local
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest suite |
| `python -m pytest` | Python suite |
| `npm run lint` | ESLint |
| `npm run seed:alumni` | Load the survey into `alumni_profiles` |
| `npm run export:training` | Append approved contributions to the training CSV |
| `python ml/train.py` | Refit the model and write its artefacts |
| `python ml/measure_paths.py` | Re-measure both published accuracy figures |

---

## Project layout

```
app/              Next.js routes — (auth), (admin), explore, questions, results, api
components/       UI, grouped by area: admin, explore, results, motion, layout
lib/              Data access, ML mirror, i18n, admin logic, motion config
services/ml/      The deployed Python service: encoder, model, ASGI entrypoint
ml/               Training, measurement, and the dataset
supabase/         10 SQL migrations, applied in order
scripts/          Seeding and the training-set export
tests/            js/ (Vitest) and python/ (pytest)
docs/             Retraining, data sources, known issues, design system
```

---

## Testing

371 JavaScript tests and 36 Python tests. Beyond the usual coverage they pin
the things that fail silently: encoder parity between the two languages, the
privacy suppression and banding rules, the admin privilege guards, and the
PostgREST query escaping.

```bash
npm test && python -m pytest
```

---

## Documentation

- [`docs/RETRAINING.md`](docs/RETRAINING.md) — how a contribution reaches the
  model, and why retraining is deliberately manual
- [`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md) — where the data comes from,
  and why national statistics cannot be used to train it
- [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) — what is still open, stated
  plainly
- [`docs/design/visual-design-system.md`](docs/design/visual-design-system.md)
  — the visual system and the decisions behind it
