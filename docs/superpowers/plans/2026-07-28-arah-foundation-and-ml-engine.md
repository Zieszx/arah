# ARAH Foundation & ML Engine — Implementation Plan (1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js + Vercel + Supabase project and ship a working, tested
scikit-learn prediction API that turns a student's answers into ranked fields of study.

**Architecture:** A Next.js App Router app (JSX) hosted on Vercel, with a Python
serverless function in the same project running scikit-learn inference. A single
generated `feature_spec.json` is the only definition of the feature encoding; both the
JavaScript client and the Python function read it, and a parity fixture proves they
agree. Supabase Postgres holds the 207 alumni training rows behind row-level security.

**Tech Stack:** Next.js 15 (App Router, JSX), Tailwind CSS v4, Supabase Postgres,
Python 3.12 on Vercel, scikit-learn, NumPy, pandas, joblib, Vitest, pytest.

## Global Constraints

- **JSX, never TSX.** No TypeScript *source* files anywhere — no `.ts`/`.tsx`, no `tsconfig.json`, no `typescript` entry in `package.json`. Transitive tooling dependencies are exempt: `eslint-config-next` bundles `typescript-eslint`, which locks `typescript` as a dev peer in `package-lock.json`. That is unavoidable without dropping Next's ESLint config and does not violate this constraint.
- **Repo root is `E:\Barang Barang\.PersonalWork\Freelance\Nuha\arah\arah`** — the directory containing `.vercel/` and `.git/`.
- **Never commit secrets.** `.gitignore` already covers `.vercel`, `.env*`, `.superpowers`. Verify with `git check-ignore` before any commit that touches config.
- **No PrimeFlex.** Tailwind is the only utility-CSS system.
- **Model artefact is committed.** `ml/model.joblib` (~2.7 MB) and `ml/feature_spec.json` are tracked in git — the Python function loads them at runtime.
- **Recorded model accuracy is 70.0% ± 1.5 top-3**, measured by **repeated stratified CV (5 folds × 5 repeats, 25 fits)**. Observed range 68.1–71.5%. A retrain scoring below **66.0%** (mean − ~2.7σ) fails the build.
- **Never quote a single-seed CV score.** A single 5-fold split on n=207 varies by ±3 points between seeds; an earlier single-seed run reported 74.4%, which repeated CV does not reproduce. Accuracy claims use the repeated-CV mean.
- **Options occurring fewer than 5 times in the survey are dropped** at spec-build time. They are free-text noise.
- **Field-of-study class list is exactly 10** and comes from the survey, verbatim including parenthetical text, e.g. `"Computer Science, Software & Data (Cybersecurity, Data Analytics etc)"`.
- Python target version is **3.12** (Vercel's `@vercel/python` default at time of writing).

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json`, `next.config.mjs`, `jsconfig.json` | App scaffold and `@/*` path alias |
| `vercel.json` | Pins the Python runtime for `api/ml/*.py` |
| `ml/data/survey.csv` | The 207-row training data, committed |
| `api/ml/encode.py` | **Single source of encoding.** NumPy only, no pandas. Used by both training and inference |
| `api/ml/predict.py` | Vercel Python function — loads model, predicts, marginalises |
| `api/ml/requirements.txt` | scikit-learn, numpy, joblib — no pandas at inference |
| `ml/train.py` | pandas + sklearn. Builds spec, trains ensemble, writes all artefacts |
| `ml/feature_spec.json` | Generated. The feature contract |
| `ml/parity_fixtures.json` | Generated. Answer→vector pairs proving JS and Python agree |
| `ml/model.joblib` | Generated. The fitted ensemble |
| `tests/python/test_encode.py` | Encoder unit tests + fixture conformance |
| `tests/python/test_model.py` | Accuracy regression guard |
| `lib/features.js` | JS mirror of the encoder, reads `feature_spec.json` |
| `tests/js/features.test.js` | Parity test — JS vector must equal the Python fixture |
| `supabase/migrations/0001_init.sql` | Tables, indexes, RLS, aggregate views |
| `scripts/seed-alumni.mjs` | Loads the 207 CSV rows into `alumni_profiles` |
| `scripts/seed-user.mjs` | Creates the `nuhaaa` demo account via the admin API |

---

## Task 1: Scaffold the Next.js app

**Files:**
- Create: `package.json`, `next.config.mjs`, `jsconfig.json`, `app/layout.jsx`, `app/page.jsx`, `app/globals.css`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: a dev server on `localhost:3000`; the `@/*` alias resolving to repo root

- [ ] **Step 1: Scaffold in place**

The repo root already contains `.git`, `.vercel` and env files, so scaffold into a temp
directory and move the files in — `create-next-app` refuses a non-empty directory.

```bash
cd "E:/Barang Barang/.PersonalWork/Freelance/Nuha/arah/arah"
npx --yes create-next-app@latest .tmp-scaffold \
  --js --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --use-npm --no-turbopack --yes
```

- [ ] **Step 2: Move scaffold into the repo root**

```bash
cd "E:/Barang Barang/.PersonalWork/Freelance/Nuha/arah/arah"
mv .tmp-scaffold/* .tmp-scaffold/.??* . 2>/dev/null || true
rm -rf .tmp-scaffold
rm -f app/favicon.ico
```

If `.gitignore` was overwritten by the scaffold, restore the three required lines —
they must survive:

```
.vercel
.env*
.superpowers
```

- [ ] **Step 3: Verify the dev server boots**

Run: `npm run dev`
Expected: `Ready in ...` and `http://localhost:3000` serves the default page. Stop with Ctrl-C.

- [ ] **Step 4: Verify no secret is stageable**

Run:
```bash
git check-ignore -v .env.local .env.development.local .env.seed.local .vercel/repo.json
```
Expected: all four listed as ignored. If any is missing, fix `.gitignore` before continuing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app router project with tailwind"
```

---

## Task 2: Test runners

**Files:**
- Create: `vitest.config.mjs`, `tests/js/smoke.test.js`, `tests/python/test_smoke.py`, `pytest.ini`, `requirements-dev.txt`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 scaffold
- Produces: `npm test` (Vitest) and `pytest` both green

- [ ] **Step 1: Install JS test deps**

```bash
npm install --save-dev vitest
```

- [ ] **Step 2: Write `vitest.config.mjs`**

```js
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { include: ['tests/js/**/*.test.js'], environment: 'node' },
  resolve: { alias: { '@': path.resolve(process.cwd()) } },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

Add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a failing JS smoke test**

Create `tests/js/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('test runner', () => {
  it('is wired up', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passed.

- [ ] **Step 6: Set up pytest**

Create `requirements-dev.txt`:

```
pandas==3.0.5
numpy==2.5.1
scikit-learn==1.9.0
joblib==1.5.3
pytest==8.3.4
```

Create `pytest.ini`:

```ini
[pytest]
testpaths = tests/python
pythonpath = . api/ml ml
```

Create `tests/python/test_smoke.py`:

```python
def test_runner_is_wired_up():
    assert 1 + 1 == 2
```

- [ ] **Step 7: Install and run**

```bash
pip install -r requirements-dev.txt
pytest -q
```
Expected: 1 passed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add vitest and pytest runners"
```

---

## Task 3: The encoder

This is the single most important file in the project. If the encoder is wrong or
drifts between languages, predictions become silently incorrect without erroring.

**Files:**
- Create: `api/ml/encode.py`, `tests/python/test_encode.py`
- Create: `ml/data/survey.csv` (copy of the source CSV)

**Interfaces:**
- Consumes: nothing
- Produces:
  - `GROUPS: list[dict]` — ordered group definitions
  - `build_spec(rows: list[dict]) -> dict` — builds `feature_spec.json` content
  - `encode_answers(answers: dict, spec: dict) -> list[float]` — the feature vector
  - `row_to_answers(row: dict) -> dict` — converts a survey CSV row to answer form
  - `SPEC_VERSION: str`

- [ ] **Step 1: Copy the survey data into the repo**

```bash
mkdir -p ml/data
cp "E:/Barang Barang/.PersonalWork/Freelance/Nuha/Post-SPM Academic Pathway and Interest Survey.csv" ml/data/survey.csv
wc -l ml/data/survey.csv
```
Expected: 208 lines (207 rows + header).

- [ ] **Step 2: Write the failing tests**

Create `tests/python/test_encode.py`:

```python
import encode


def test_groups_are_ten_and_ordered():
    keys = [g["key"] for g in encode.GROUPS]
    assert keys == [
        "stream", "enjoyed", "difficult", "tasks", "traits",
        "personality", "results", "preu", "school", "speaking",
    ]


def test_build_spec_drops_rare_options():
    rows = []
    for i in range(10):
        rows.append({
            "stream": ["Science"],
            "enjoyed": [], "difficult": [], "tasks": [], "traits": [],
            "personality": "Introvert", "results": "9+ As", "preu": "STPM",
            "school": "Public", "speaking": 3, "field": "Science & Mathematics",
        })
    rows[0]["stream"] = ["Science", "Typed nonsense answer"]
    spec = encode.build_spec(rows)
    stream = next(g for g in spec["groups"] if g["key"] == "stream")
    assert stream["options"] == ["Science"]


def test_encode_multi_select_sets_one_hot_positions():
    spec = {
        "version": "t", "groups": [
            {"key": "stream", "type": "multi", "options": ["A", "B", "C"]},
            {"key": "speaking", "type": "num", "min": 1, "max": 5},
        ],
        "classes": [],
    }
    vec = encode.encode_answers({"stream": ["A", "C"], "speaking": 5}, spec)
    assert vec == [1.0, 0.0, 1.0, 1.0]


def test_encode_single_select():
    spec = {
        "version": "t",
        "groups": [{"key": "personality", "type": "single",
                    "options": ["Introvert", "Extrovert"]}],
        "classes": [],
    }
    assert encode.encode_answers({"personality": "Extrovert"}, spec) == [0.0, 1.0]


def test_unseen_value_encodes_as_all_zeros_for_that_group():
    spec = {
        "version": "t",
        "groups": [{"key": "results", "type": "single", "options": ["9+ As", "6 - 8 As"]}],
        "classes": [],
    }
    assert encode.encode_answers({"results": "Fail"}, spec) == [0.0, 0.0]


def test_missing_numeric_defaults_to_midpoint():
    spec = {
        "version": "t",
        "groups": [{"key": "speaking", "type": "num", "min": 1, "max": 5}],
        "classes": [],
    }
    assert encode.encode_answers({}, spec) == [0.6]


def test_vector_length_matches_spec():
    spec = {
        "version": "t", "groups": [
            {"key": "stream", "type": "multi", "options": ["A", "B"]},
            {"key": "personality", "type": "single", "options": ["X", "Y", "Z"]},
            {"key": "speaking", "type": "num", "min": 1, "max": 5},
        ],
        "classes": [],
    }
    assert len(encode.encode_answers({}, spec)) == 6
    assert encode.n_features(spec) == 6
```

- [ ] **Step 3: Run to verify they fail**

Run: `pytest tests/python/test_encode.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'encode'`

- [ ] **Step 4: Write `api/ml/encode.py`**

```python
"""Feature encoding for ARAH.

This module is the ONE definition of how a student's answers become a numeric
vector. `ml/train.py` uses it to build the training matrix; `api/ml/predict.py`
uses it at inference. `lib/features.js` mirrors it in JavaScript and is held to
that mirror by `ml/parity_fixtures.json`.

NumPy is not imported here on purpose — plain lists keep this importable from
anywhere with no dependency cost.
"""

SPEC_VERSION = "2026-07-28"

# Ordered. The order defines the feature vector layout and must never change
# without regenerating the model.
GROUPS = [
    {"key": "stream",      "col": 5,  "type": "multi",  "max_select": 2,
     "label": "Which stream did you take during SPM?"},
    {"key": "enjoyed",     "col": 7,  "type": "multi",  "max_select": 3,
     "label": "Which subjects did you enjoy most?"},
    {"key": "difficult",   "col": 8,  "type": "multi",  "max_select": 3,
     "label": "Which subjects did you find most difficult?"},
    {"key": "tasks",       "col": 10, "type": "multi",  "max_select": 2,
     "label": "Which type of tasks do you enjoy most?"},
    {"key": "traits",      "col": 11, "type": "multi",  "max_select": 3,
     "label": "How would you describe your characteristics?"},
    {"key": "personality", "col": 9,  "type": "single",
     "label": "How would you describe your personality?"},
    {"key": "results",     "col": 6,  "type": "single",
     "label": "What was your SPM results?"},
    {"key": "preu",        "col": 13, "type": "single", "optional": True,
     "label": "Which pre-U route are you leaning towards?"},
    {"key": "school",      "col": 4,  "type": "single",
     "label": "What type of secondary school did you attend?"},
    {"key": "speaking",    "col": 12, "type": "num", "min": 1, "max": 5,
     "label": "How comfortable are you with public speaking?"},
]

FIELD_COL = 14
MIN_OPTION_COUNT = 5


def _split_multi(raw):
    if not raw:
        return []
    return [p.strip() for p in str(raw).split(";") if p.strip()]


def row_to_answers(row_values):
    """Convert one survey CSV row (list of cell strings) to answer form."""
    answers = {}
    for g in GROUPS:
        raw = row_values[g["col"]] if g["col"] < len(row_values) else ""
        raw = (raw or "").strip()
        if g["type"] == "multi":
            answers[g["key"]] = _split_multi(raw)
        elif g["type"] == "num":
            try:
                answers[g["key"]] = float(raw)
            except (TypeError, ValueError):
                answers[g["key"]] = None
        else:
            answers[g["key"]] = raw or None
    return answers


def build_spec(rows):
    """Build the feature spec from answer-form rows.

    Each row is a dict of answers plus a "field" key holding the outcome.
    Options seen fewer than MIN_OPTION_COUNT times are dropped as free-text noise.
    """
    groups_out = []
    for g in GROUPS:
        entry = {"key": g["key"], "type": g["type"], "label": g["label"]}
        if g.get("max_select"):
            entry["max_select"] = g["max_select"]
        if g.get("optional"):
            entry["optional"] = True

        if g["type"] == "num":
            entry["min"] = g["min"]
            entry["max"] = g["max"]
        else:
            counts = {}
            for r in rows:
                v = r.get(g["key"])
                vals = v if isinstance(v, list) else ([v] if v else [])
                for x in vals:
                    if x:
                        counts[x] = counts.get(x, 0) + 1
            entry["options"] = sorted(
                [k for k, c in counts.items() if c >= MIN_OPTION_COUNT]
            )
        groups_out.append(entry)

    class_counts = {}
    for r in rows:
        f = r.get("field")
        if f:
            class_counts[f] = class_counts.get(f, 0) + 1

    preu_counts = {}
    for r in rows:
        v = r.get("preu")
        if v:
            preu_counts[v] = preu_counts.get(v, 0) + 1

    spec = {
        "version": SPEC_VERSION,
        "groups": groups_out,
        "classes": sorted(class_counts.keys()),
        "class_counts": class_counts,
        "preu_priors": preu_counts,
    }
    spec["n_features"] = n_features(spec)
    return spec


def n_features(spec):
    total = 0
    for g in spec["groups"]:
        total += 1 if g["type"] == "num" else len(g["options"])
    return total


def encode_answers(answers, spec):
    """Answers dict -> flat list of floats, ordered by spec['groups'].

    An unrecognised value contributes all-zeros for its group rather than
    raising, so a student selecting an option the model never saw still gets a
    prediction from their remaining answers.
    """
    vec = []
    for g in spec["groups"]:
        if g["type"] == "num":
            raw = answers.get(g["key"])
            try:
                val = float(raw)
            except (TypeError, ValueError):
                val = (g["min"] + g["max"]) / 2.0
            vec.append(round(val / g["max"], 10))
            continue

        raw = answers.get(g["key"])
        selected = raw if isinstance(raw, list) else ([raw] if raw else [])
        selected = set(x for x in selected if x)
        vec.extend(1.0 if opt in selected else 0.0 for opt in g["options"])
    return vec
```

- [ ] **Step 5: Run the tests**

Run: `pytest tests/python/test_encode.py -q`
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
git add api/ml/encode.py tests/python/test_encode.py ml/data/survey.csv
git commit -m "feat(ml): add feature encoder with rare-option filtering and unseen-value fallback"
```

---

## Task 4: Train the model and emit artefacts

**Files:**
- Create: `ml/train.py`, `tests/python/test_model.py`
- Generates: `ml/feature_spec.json`, `ml/model.joblib`, `ml/parity_fixtures.json`

**Interfaces:**
- Consumes: `encode.GROUPS`, `encode.build_spec`, `encode.encode_answers`, `encode.row_to_answers`
- Produces:
  - `ml/model.joblib` — dict with keys `model`, `spec`, `classes`, `cv_top3`
  - `ml/feature_spec.json` — the spec, for `lib/features.js`
  - `ml/parity_fixtures.json` — `{"spec_version": str, "cases": [{"answers": {...}, "vector": [...]}]}`

- [ ] **Step 1: Write the failing accuracy test**

Create `tests/python/test_model.py`:

```python
import json
import os
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL = os.path.join(ROOT, "ml", "model.joblib")
SPEC = os.path.join(ROOT, "ml", "feature_spec.json")
FIXTURES = os.path.join(ROOT, "ml", "parity_fixtures.json")

pytestmark = pytest.mark.skipif(
    not os.path.exists(MODEL), reason="run `python ml/train.py` first"
)


def test_artefacts_exist():
    assert os.path.exists(SPEC)
    assert os.path.exists(FIXTURES)


def test_spec_has_ten_groups_and_ten_classes():
    spec = json.load(open(SPEC, encoding="utf-8"))
    assert len(spec["groups"]) == 10
    assert len(spec["classes"]) == 10
    # 55, not 56: "Pass (Lulus)" appears once in the survey and is filtered by
    # MIN_OPTION_COUNT, so `results` contributes 4 options rather than 5.
    assert spec["n_features"] == 55


def test_recorded_accuracy_meets_floor():
    import joblib
    bundle = joblib.load(MODEL)
    assert bundle["cv_top3"] >= 66.0, (
        f"top-3 accuracy regressed to {bundle['cv_top3']:.1f}% (floor 66.0%)"
    )


def test_accuracy_is_a_repeated_cv_estimate():
    """Guards against reverting to a single-seed score, which reads ~4 points high."""
    import joblib
    bundle = joblib.load(MODEL)
    assert bundle["cv_repeats"] >= 5
    assert bundle["cv_std"] > 0.0


def test_fixtures_match_encoder():
    import encode
    spec = json.load(open(SPEC, encoding="utf-8"))
    fx = json.load(open(FIXTURES, encoding="utf-8"))
    assert len(fx["cases"]) >= 5
    for case in fx["cases"]:
        assert encode.encode_answers(case["answers"], spec) == case["vector"]
```

- [ ] **Step 2: Run to verify it skips**

Run: `pytest tests/python/test_model.py -q`
Expected: 4 skipped ("run `python ml/train.py` first").

- [ ] **Step 3: Write `ml/train.py`**

```python
"""Train the ARAH ensemble and emit every artefact the app needs.

Run:  python ml/train.py
Emits: ml/feature_spec.json, ml/model.joblib, ml/parity_fixtures.json
"""
import csv
import json
import os
import sys

import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import BernoulliNB
from sklearn.neighbors import KNeighborsClassifier

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "api", "ml"))
import encode  # noqa: E402

CSV_PATH = os.path.join(ROOT, "ml", "data", "survey.csv")
OUT_SPEC = os.path.join(ROOT, "ml", "feature_spec.json")
OUT_MODEL = os.path.join(ROOT, "ml", "model.joblib")
OUT_FIXTURES = os.path.join(ROOT, "ml", "parity_fixtures.json")


def load_rows():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        raw = [r for r in reader if any(c.strip() for c in r)]

    # Guard against silent column drift.
    assert "gender" in header[1].lower(), f"unexpected header: {header[1]!r}"
    assert "major" in header[encode.FIELD_COL].lower(), \
        f"unexpected outcome column: {header[encode.FIELD_COL]!r}"

    rows = []
    for r in raw:
        a = encode.row_to_answers(r)
        a["field"] = r[encode.FIELD_COL].strip()
        if a["field"]:
            rows.append(a)
    return rows


def build_estimator():
    return VotingClassifier(
        estimators=[
            ("knn", KNeighborsClassifier(n_neighbors=15, metric="cosine",
                                         weights="distance")),
            ("lr", LogisticRegression(max_iter=3000, class_weight="balanced")),
            ("rf", RandomForestClassifier(n_estimators=600, min_samples_leaf=2,
                                          class_weight="balanced_subsample",
                                          random_state=42, n_jobs=-1)),
            ("nb", BernoulliNB(alpha=0.5)),
        ],
        voting="soft",
        weights=[2, 2, 1, 1],
    )


CV_REPEATS = 5
CV_FOLDS = 5


def cv_top3(X, y, folds=CV_FOLDS, repeats=CV_REPEATS):
    """Repeated stratified CV.

    A single 5-fold split on n=207 swings roughly +/-3 points depending on the
    seed, which is enough to turn a 70% model into a 74% headline. Averaging
    over several repeats gives a number that survives being quoted.
    """
    scores = []
    for rep in range(repeats):
        skf = StratifiedKFold(n_splits=folds, shuffle=True, random_state=100 + rep)
        hits = total = 0
        for tr, te in skf.split(X, y):
            m = build_estimator().fit(X[tr], y[tr])
            proba = m.predict_proba(X[te])
            order = np.argsort(-proba, axis=1)
            for i, truth in enumerate(y[te]):
                if truth in m.classes_[order[i]][:3]:
                    hits += 1
                total += 1
        scores.append(hits / total * 100.0)
    mean = sum(scores) / len(scores)
    var = sum((s - mean) ** 2 for s in scores) / (len(scores) - 1)
    return mean, var ** 0.5, scores


def main():
    rows = load_rows()
    print(f"loaded {len(rows)} rows")

    spec = encode.build_spec(rows)
    print(f"spec: {len(spec['groups'])} groups, "
          f"{spec['n_features']} features, {len(spec['classes'])} classes")

    X = np.array([encode.encode_answers(r, spec) for r in rows], dtype=float)
    y = np.array([r["field"] for r in rows])

    mean, std, scores = cv_top3(X, y)
    print(f"repeated CV top-3: {mean:.1f}% +/- {std:.1f} "
          f"({CV_FOLDS} folds x {CV_REPEATS} repeats, "
          f"range {min(scores):.1f}-{max(scores):.1f})")
    if mean < 66.0:
        raise SystemExit(f"ABORT: top-3 {mean:.1f}% is below the 66.0% floor")

    model = build_estimator().fit(X, y)

    with open(OUT_SPEC, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=1, ensure_ascii=False)

    joblib.dump(
        {"model": model, "spec": spec, "classes": list(model.classes_),
         "cv_top3": mean, "cv_std": std, "cv_repeats": CV_REPEATS,
         "cv_folds": CV_FOLDS, "cv_scores": scores},
        OUT_MODEL, compress=3,
    )

    # Parity fixtures: real rows + edge cases the JS encoder must reproduce.
    cases = [dict(answers={k: v for k, v in r.items() if k != "field"})
             for r in rows[:6]]
    cases.append({"answers": {}})                                  # all-empty
    cases.append({"answers": {"results": "Fail", "speaking": 5}})   # unseen value
    for c in cases:
        c["vector"] = encode.encode_answers(c["answers"], spec)

    with open(OUT_FIXTURES, "w", encoding="utf-8") as f:
        json.dump({"spec_version": spec["version"], "cases": cases},
                  f, indent=1, ensure_ascii=False)

    size = os.path.getsize(OUT_MODEL) / 1024 / 1024
    print(f"wrote model.joblib ({size:.1f} MB), feature_spec.json, "
          f"parity_fixtures.json ({len(cases)} cases)")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Train**

Run: `python ml/train.py`

Expected output includes `loaded 207 rows`, `55 features`, `10 classes`, and a
repeated-CV line reading roughly `repeated CV top-3: 70.0% +/- 1.5 (5 folds x 5 repeats,
range 68.1-71.5)`, then three artefacts written.

This step runs 25 ensemble fits and takes a few minutes. If it prints a mean near 74%,
something has reverted to single-seed scoring — check `cv_top3`.

- [ ] **Step 5: Run the model tests**

Run: `pytest tests/python -q`
Expected: all pass, nothing skipped.

- [ ] **Step 6: Commit**

```bash
git add ml/train.py ml/feature_spec.json ml/model.joblib ml/parity_fixtures.json tests/python/test_model.py
git commit -m "feat(ml): train soft-voting ensemble and emit spec, model and parity fixtures"
```

---

## Task 5: JavaScript encoder and the parity test

**Files:**
- Create: `lib/features.js`, `tests/js/features.test.js`

**Interfaces:**
- Consumes: `ml/feature_spec.json`, `ml/parity_fixtures.json`
- Produces:
  - `getSpec(): object`
  - `getGroups(): object[]`
  - `encodeAnswers(answers: object): number[]`
  - `validateAnswers(answers: object): {ok: boolean, errors: object}`

- [ ] **Step 1: Write the failing parity test**

Create `tests/js/features.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { encodeAnswers, getSpec, validateAnswers } from '@/lib/features.js';

const fixtures = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'ml/parity_fixtures.json'), 'utf8'),
);

describe('feature spec', () => {
  it('matches the version the fixtures were generated from', () => {
    expect(getSpec().version).toBe(fixtures.spec_version);
  });

  it('declares 10 groups', () => {
    expect(getSpec().groups).toHaveLength(10);
  });
});

describe('JS/Python encoding parity', () => {
  it('declares the expected feature count', () => {
    expect(getSpec().n_features).toBe(55);
  });

  it.each(fixtures.cases.map((c, i) => [i, c]))(
    'case %i produces an identical vector to Python',
    (_i, testCase) => {
      expect(encodeAnswers(testCase.answers)).toEqual(testCase.vector);
    },
  );
});

describe('validateAnswers', () => {
  it('rejects more selections than max_select allows', () => {
    const stream = getSpec().groups.find((g) => g.key === 'stream');
    const tooMany = stream.options.slice(0, stream.max_select + 1);
    const res = validateAnswers({ stream: tooMany });
    expect(res.ok).toBe(false);
    expect(res.errors.stream).toMatch(/at most/i);
  });

  it('requires every non-optional group', () => {
    const res = validateAnswers({});
    expect(res.ok).toBe(false);
    expect(res.errors.preu).toBeUndefined(); // pre-U is optional
    expect(res.errors.stream).toBeDefined();
  });

  it('accepts a complete answer set', () => {
    const spec = getSpec();
    const answers = {};
    for (const g of spec.groups) {
      if (g.type === 'num') answers[g.key] = 3;
      else if (g.type === 'multi') answers[g.key] = [g.options[0]];
      else answers[g.key] = g.options[0];
    }
    expect(validateAnswers(answers).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/features.js`.

- [ ] **Step 3: Write `lib/features.js`**

```js
/**
 * JavaScript mirror of api/ml/encode.py.
 *
 * The encoding logic exists in two languages because the quiz renders in the
 * browser and inference runs in Python. They are held in lockstep by
 * ml/parity_fixtures.json — if these two ever disagree, tests/js/features.test.js
 * fails. Never edit this file without re-running `python ml/train.py`.
 */
import spec from '@/ml/feature_spec.json' with { type: 'json' };

export function getSpec() {
  return spec;
}

export function getGroups() {
  return spec.groups;
}

/** Answers object -> flat number[], ordered by spec.groups. */
export function encodeAnswers(answers = {}) {
  const vec = [];
  for (const g of spec.groups) {
    if (g.type === 'num') {
      const raw = Number(answers[g.key]);
      const val = Number.isFinite(raw) ? raw : (g.min + g.max) / 2;
      vec.push(round10(val / g.max));
      continue;
    }
    const raw = answers[g.key];
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const selected = new Set(list.filter(Boolean));
    for (const opt of g.options) vec.push(selected.has(opt) ? 1 : 0);
  }
  return vec;
}

/** Mirrors Python's round(x, 10) so the parity fixtures compare exactly. */
function round10(n) {
  return Number(n.toFixed(10));
}

export function validateAnswers(answers = {}) {
  const errors = {};
  for (const g of spec.groups) {
    const raw = answers[g.key];

    if (g.type === 'num') {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < g.min || n > g.max) {
        errors[g.key] = `Choose a value between ${g.min} and ${g.max}.`;
      }
      continue;
    }

    const list = Array.isArray(raw) ? raw.filter(Boolean) : raw ? [raw] : [];

    if (list.length === 0) {
      if (!g.optional) errors[g.key] = 'Please answer this question.';
      continue;
    }
    if (g.max_select && list.length > g.max_select) {
      errors[g.key] = `Choose at most ${g.max_select}.`;
      continue;
    }
    if (g.type === 'single' && list.length > 1) {
      errors[g.key] = 'Choose one option.';
      continue;
    }
    const unknown = list.filter((v) => !g.options.includes(v));
    if (unknown.length) errors[g.key] = `Unrecognised option: ${unknown[0]}`;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: all pass, including one parity case per fixture.

If a parity case fails, the JS and Python encoders disagree — **fix the encoder, never
the fixture.** The fixture is generated from Python, which is what the model was
trained on.

- [ ] **Step 5: Commit**

```bash
git add lib/features.js tests/js/features.test.js
git commit -m "feat: add JS encoder mirroring python, enforced by parity fixtures"
```

---

## Task 6: The prediction function

**Files:**
- Create: `api/ml/predict.py`, `api/ml/requirements.txt`, `vercel.json`, `tests/python/test_predict.py`

**Interfaces:**
- Consumes: `encode.encode_answers`, `ml/model.joblib`
- Produces: `POST /api/ml/predict`
  - Request: `{"answers": {...}}`
  - Response: `{"ranked": [{"field": str, "probability": float}], "model_version": str, "marginalised": bool}`
  - Also exports `predict(answers) -> dict` for direct testing

- [ ] **Step 1: Write the failing tests**

Create `tests/python/test_predict.py`:

```python
import os
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pytestmark = pytest.mark.skipif(
    not os.path.exists(os.path.join(ROOT, "ml", "model.joblib")),
    reason="run `python ml/train.py` first",
)


def _full_answers(spec, **over):
    a = {}
    for g in spec["groups"]:
        if g["type"] == "num":
            a[g["key"]] = 3
        elif g["type"] == "multi":
            a[g["key"]] = [g["options"][0]]
        else:
            a[g["key"]] = g["options"][0]
    a.update(over)
    return a


def test_probabilities_sum_to_one_and_are_sorted():
    import predict
    spec = predict.load()["spec"]
    out = predict.predict(_full_answers(spec))
    probs = [r["probability"] for r in out["ranked"]]
    assert len(out["ranked"]) == 10
    assert abs(sum(probs) - 1.0) < 1e-6
    assert probs == sorted(probs, reverse=True)
    assert out["marginalised"] is False


def test_technical_computing_student_ranks_computer_science_first():
    import predict
    spec = predict.load()["spec"]
    answers = _full_answers(
        spec,
        stream=[o for o in spec["groups"][0]["options"] if "Technical" in o],
        enjoyed=[o for o in spec["groups"][1]["options"]
                 if "Technology" in o or "Mathematical" in o],
        tasks=[o for o in spec["groups"][3]["options"] if "Analysing" in o],
        traits=[o for o in spec["groups"][4]["options"] if o in ("Analytical", "Observant")],
    )
    top = predict.predict(answers)["ranked"][0]["field"]
    assert "Computer Science" in top


def test_missing_preu_marginalises():
    import predict
    spec = predict.load()["spec"]
    answers = _full_answers(spec)
    answers.pop("preu")
    out = predict.predict(answers)
    assert out["marginalised"] is True
    assert abs(sum(r["probability"] for r in out["ranked"]) - 1.0) < 1e-6


def test_unseen_value_does_not_raise():
    import predict
    spec = predict.load()["spec"]
    out = predict.predict(_full_answers(spec, results="Fail"))
    assert len(out["ranked"]) == 10
```

- [ ] **Step 2: Run to verify they fail**

Run: `pytest tests/python/test_predict.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'predict'`

- [ ] **Step 3: Write `api/ml/predict.py`**

```python
"""Vercel Python function: rank fields of study for a student's answers.

The model is loaded once into a module-level global and reused across
invocations — on Fluid Compute the instance stays warm, so this cost is paid
roughly once rather than per request.
"""
import json
import os

import joblib
import numpy as np

import encode

_BUNDLE = None
_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "ml", "model.joblib",
)


def load():
    global _BUNDLE
    if _BUNDLE is None:
        bundle = joblib.load(_MODEL_PATH)
        spec = bundle["spec"]
        # Fail loudly rather than predicting on a misaligned vector.
        expected = encode.n_features(spec)
        actual = bundle["model"].estimators_[0].n_features_in_
        if expected != actual:
            raise RuntimeError(
                f"feature spec mismatch: spec declares {expected}, "
                f"model was fitted on {actual}"
            )
        _BUNDLE = bundle
    return _BUNDLE


def _rank(proba, classes):
    order = np.argsort(-proba)
    return [
        {"field": str(classes[i]), "probability": round(float(proba[i]), 6)}
        for i in order
    ]


def predict(answers):
    bundle = load()
    model, spec = bundle["model"], bundle["spec"]
    classes = model.classes_

    preu_group = next(g for g in spec["groups"] if g["key"] == "preu")
    has_preu = bool(answers.get("preu")) and answers.get("preu") in preu_group["options"]

    if has_preu:
        vec = np.array([encode.encode_answers(answers, spec)], dtype=float)
        proba = model.predict_proba(vec)[0]
        marginalised = False
    else:
        # The student hasn't chosen a pre-U route. Predict once per route and
        # average, weighted by how common each route is in the training data.
        priors = spec.get("preu_priors", {})
        opts = preu_group["options"]
        weights = np.array([priors.get(o, 1) for o in opts], dtype=float)
        weights /= weights.sum()

        vectors = []
        for o in opts:
            a = dict(answers)
            a["preu"] = o
            vectors.append(encode.encode_answers(a, spec))
        probas = model.predict_proba(np.array(vectors, dtype=float))
        proba = np.average(probas, axis=0, weights=weights)
        marginalised = True

    proba = proba / proba.sum()
    return {
        "ranked": _rank(proba, classes),
        "model_version": spec["version"],
        "marginalised": marginalised,
    }


# --- Vercel handler -------------------------------------------------------
from http.server import BaseHTTPRequestHandler  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("content-length") or 0)
            body = json.loads(self.rfile.read(length) or b"{}")
            answers = body.get("answers")
            if not isinstance(answers, dict):
                return self._send(400, {"error": "body must be {\"answers\": {...}}"})
            return self._send(200, predict(answers))
        except Exception as exc:  # noqa: BLE001
            return self._send(500, {"error": type(exc).__name__, "detail": str(exc)})

    def do_GET(self):
        try:
            load()
            self._send(200, {"status": "ok", "model_version": load()["spec"]["version"]})
        except Exception as exc:  # noqa: BLE001
            self._send(500, {"status": "error", "detail": str(exc)})

    def _send(self, code, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
```

- [ ] **Step 4: Add the runtime files**

Create `api/ml/requirements.txt` — note pandas is deliberately absent, it is only
needed for training:

```
scikit-learn==1.9.0
numpy==2.5.1
joblib==1.5.3
```

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/ml/*.py": { "runtime": "@vercel/python@5.0.0", "memory": 1024, "maxDuration": 30 }
  }
}
```

- [ ] **Step 5: Run the tests**

Run: `pytest tests/python -q`
Expected: all pass.

- [ ] **Step 6: Verify the function serves over HTTP**

```bash
npx --yes vercel dev --listen 3000
```

In a second terminal:

```bash
curl -s http://localhost:3000/api/ml/predict
```
Expected: `{"status": "ok", "model_version": "2026-07-28"}`

Then a real prediction:

```bash
curl -s -X POST http://localhost:3000/api/ml/predict \
  -H 'content-type: application/json' \
  -d '{"answers":{"stream":["Technical & Vocational (Sains Komputer, Rekacipta, Lukisan Kejuruteraan etc)"],"enjoyed":["Mathematical Subjects","Technology & Computing Subjects"],"difficult":["Language Subjects (B. Melayu, B. Inggeris, B. Arab)"],"tasks":["Analysing and interpreting data"],"traits":["Analytical","Observant","Strategic"],"personality":"Introvert","results":"6 - 8 As (A-, A, A+)","school":"Public School (SMK / SMJKC)","speaking":2}}'
```
Expected: JSON with `"marginalised": true` (no pre-U given) and Computer Science ranked first.

Stop `vercel dev` with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add api/ml/predict.py api/ml/requirements.txt vercel.json tests/python/test_predict.py
git commit -m "feat(ml): add prediction function with pre-U marginalisation"
```

---

## Task 7: Database schema

**Files:**
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Consumes: nothing
- Produces: tables `alumni_profiles`, `profiles`, `quiz_responses`, `predictions`, `fields`; view `field_stats`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_init.sql`:

```sql
-- ARAH initial schema

create table if not exists alumni_profiles (
  id                  uuid primary key default gen_random_uuid(),
  gender              text,
  spm_year            text,
  state               text,
  school_type         text,
  streams             text[] not null default '{}',
  spm_results         text,
  subjects_enjoyed    text[] not null default '{}',
  subjects_difficult  text[] not null default '{}',
  personality         text,
  tasks_enjoyed       text[] not null default '{}',
  characteristics     text[] not null default '{}',
  public_speaking     int check (public_speaking between 1 and 5),
  preu_program        text,
  field_of_study      text not null,
  reasons             text[] not null default '{}',
  stream_related      boolean,
  satisfaction        int check (satisfaction between 1 and 5),
  advice              text,
  source              text not null default 'survey_2025',
  verified            boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists alumni_field_idx on alumni_profiles (field_of_study);
create index if not exists alumni_verified_idx on alumni_profiles (verified);

create table if not exists profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now()
);

create table if not exists quiz_responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  answers     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists quiz_user_idx on quiz_responses (user_id, created_at desc);

create table if not exists predictions (
  id                uuid primary key default gen_random_uuid(),
  quiz_response_id  uuid not null references quiz_responses (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  results           jsonb not null,
  model_version     text not null,
  marginalised      boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists pred_user_idx on predictions (user_id, created_at desc);

create table if not exists fields (
  slug          text primary key,
  name          text not null,
  blurb         text,
  common_preu   text[] not null default '{}'
);

-- Row level security -------------------------------------------------------
alter table profiles        enable row level security;
alter table quiz_responses  enable row level security;
alter table predictions     enable row level security;
alter table alumni_profiles enable row level security;
alter table fields          enable row level security;

create policy "own profile"        on profiles       for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "own responses"      on quiz_responses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own predictions"    on predictions    for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fields are public"  on fields         for select using (true);

-- No select policy on alumni_profiles: raw rows are never client-readable.
-- Free-text advice plus rare demographic combinations could re-identify a
-- respondent, so aggregates are exposed through this view instead.
create or replace view field_stats
with (security_invoker = false) as
  select
    field_of_study,
    count(*)::int                       as sample_size,
    round(avg(satisfaction)::numeric, 2) as avg_satisfaction,
    round(
      100.0 * count(*) filter (where satisfaction <= 2) / nullif(count(*), 0), 1
    )                                    as pct_dissatisfied,
    mode() within group (order by preu_program) as common_preu
  from alumni_profiles
  where verified
  group by field_of_study;

grant select on field_stats to anon, authenticated;
```

- [ ] **Step 2: Apply it**

Open the Supabase SQL editor for the linked project and run the file, or:

```bash
npx --yes supabase db push --db-url "$POSTGRES_URL_NON_POOLING"
```

- [ ] **Step 3: Verify RLS blocks raw alumni reads**

In the SQL editor:

```sql
set role anon;
select count(*) from alumni_profiles;  -- expect: permission denied / 0 rows
select * from field_stats limit 3;      -- expect: rows
reset role;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): initial schema with RLS and aggregate-only alumni access"
```

---

## Task 8: Seed the database

**Files:**
- Create: `scripts/seed-alumni.mjs`, `scripts/seed-user.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ml/data/survey.csv`, `SUPABASE_SERVICE_ROLE_KEY`, `.env.seed.local`
- Produces: 207 verified rows in `alumni_profiles`; the `nuhaaa` auth user

- [ ] **Step 1: Install deps**

```bash
npm install @supabase/supabase-js
npm install --save-dev dotenv csv-parse
```

- [ ] **Step 2: Write `scripts/seed-alumni.mjs`**

```js
/**
 * Load the 207 survey rows into alumni_profiles.
 * Idempotent: clears source='survey_2025' first, so re-running is safe.
 *
 * Run: npm run seed:alumni
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const db = createClient(url, key, { auth: { persistSession: false } });

const rows = parse(readFileSync('ml/data/survey.csv', 'utf8'), {
  columns: false, skip_empty_lines: true, bom: true,
});
const [header, ...body] = rows;
if (!/gender/i.test(header[1])) throw new Error(`unexpected header: ${header[1]}`);

const multi = (v) => (v ?? '').split(';').map((s) => s.trim()).filter(Boolean);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const txt = (v) => (v ?? '').trim() || null;

const records = body
  .filter((r) => txt(r[14]))
  .map((r) => ({
    gender: txt(r[1]), spm_year: txt(r[2]), state: txt(r[3]), school_type: txt(r[4]),
    streams: multi(r[5]), spm_results: txt(r[6]),
    subjects_enjoyed: multi(r[7]), subjects_difficult: multi(r[8]),
    personality: txt(r[9]), tasks_enjoyed: multi(r[10]), characteristics: multi(r[11]),
    public_speaking: num(r[12]), preu_program: txt(r[13]), field_of_study: txt(r[14]),
    reasons: multi(r[15]),
    stream_related: txt(r[16]) === null ? null : /^yes$/i.test(txt(r[16])),
    satisfaction: num(r[17]), advice: txt(r[18]),
    source: 'survey_2025', verified: true,
  }));

await db.from('alumni_profiles').delete().eq('source', 'survey_2025');

for (let i = 0; i < records.length; i += 100) {
  const chunk = records.slice(i, i + 100);
  const { error } = await db.from('alumni_profiles').insert(chunk);
  if (error) throw error;
  console.log(`inserted ${Math.min(i + 100, records.length)}/${records.length}`);
}

const { count } = await db
  .from('alumni_profiles')
  .select('*', { count: 'exact', head: true });
console.log(`done — alumni_profiles now holds ${count} rows`);
if (count !== 207) throw new Error(`expected 207 rows, found ${count}`);
```

- [ ] **Step 3: Write `scripts/seed-user.mjs`**

```js
/**
 * Create the demo account from .env.seed.local.
 * Uses email_confirm so no confirmation email is needed.
 *
 * Run: npm run seed:user
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.seed.local' });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;
const name = process.env.SEED_USER_NAME;

if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
if (!email || !password) throw new Error('.env.seed.local is missing SEED_USER_EMAIL/PASSWORD');

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await db.auth.admin.listUsers();
const found = existing?.users?.find((u) => u.email === email);

let userId;
if (found) {
  userId = found.id;
  await db.auth.admin.updateUserById(userId, { password, email_confirm: true });
  console.log(`updated existing user ${email}`);
} else {
  const { data, error } = await db.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`created user ${email}`);
}

const { error: pErr } = await db
  .from('profiles')
  .upsert({ id: userId, display_name: name }, { onConflict: 'id' });
if (pErr) throw pErr;
console.log(`profile ready — display_name="${name}"`);
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
"seed:alumni": "node --env-file=.env.development.local scripts/seed-alumni.mjs",
"seed:user": "node --env-file=.env.development.local scripts/seed-user.mjs"
```

- [ ] **Step 5: Run both**

```bash
npm run seed:alumni
npm run seed:user
```
Expected: `alumni_profiles now holds 207 rows`, then `created user nuhaaa@arah.app`.

- [ ] **Step 6: Verify aggregates populated**

In the Supabase SQL editor:

```sql
select * from field_stats order by sample_size desc;
```
Expected: 10 rows. Business & Management 44, Computer Science & Data 35, Creative Art 9,
Humanities 7 — matching the recorded distribution.

- [ ] **Step 7: Confirm no secret is stageable, then commit**

```bash
git check-ignore -v .env.seed.local   # must print a match
git add scripts/seed-alumni.mjs scripts/seed-user.mjs package.json package-lock.json
git commit -m "feat(db): seed 207 alumni rows and the demo account"
```

---

## Self-Review

**Spec coverage.** §5 encoding contract → Tasks 3–5. §5 pre-U marginalisation → Task 6.
§6 data model and RLS → Task 7. §7 unseen-value fallback → Tasks 3 and 6. §10 testing
(parity, model regression) → Tasks 4–6. Landing/quiz/results/explore/contribute UI, the
motion system and the retraining job are **deliberately out of scope for this plan** and
are covered by plans 2–4 below.

**Type consistency.** `encode_answers(answers, spec)` / `encodeAnswers(answers)`,
`n_features(spec)` / `spec.n_features`, and the `{ranked, model_version, marginalised}`
response shape are used identically in Tasks 3, 4, 5 and 6. The joblib bundle keys
(`model`, `spec`, `classes`, `cv_top3`) written in Task 4 are exactly those read in
Tasks 4 and 6.

**Known gap, resolved by design:** `field_stats` filters on `verified`, and Task 8 seeds
the survey rows with `verified: true`. User contributions default to `false` and are
therefore excluded from both stats and training until reviewed — which is the intent.

---

## Remaining plans

| Plan | Scope | Deliverable |
|---|---|---|
| **2 — Design system & motion** | Tokens, Instrument Serif + Inter via `next/font`, shadcn init, particle field with spatial hash, sand cursor, spotlight, reduced-motion and touch fallbacks, core components | A styled component kit with a demo route |
| **3 — Student journey** | Supabase auth, the 10-question quiz, `/api/quiz` orchestration, results dashboard with confidence tiers and explainability | signup → quiz → results working end to end |
| **4 — Depth & growth** | Landing page with GSAP storytelling, `/explore` + `/explore/[field]`, `/contribute`, scheduled retraining, prior calibration | The full product |
