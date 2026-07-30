"""Train the ARAH ensemble and emit every artefact the app needs.

Run:  python ml/train.py
Emits: services/ml/feature_spec.json, services/ml/model.joblib,
       ml/parity_fixtures.json
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
sys.path.insert(0, os.path.join(ROOT, "services", "ml"))
import encode  # noqa: E402

CSV_PATH = os.path.join(ROOT, "ml", "data", "survey.csv")
OUT_SPEC = os.path.join(ROOT, "services", "ml", "feature_spec.json")
OUT_MODEL = os.path.join(ROOT, "services", "ml", "model.joblib")
OUT_FIXTURES = os.path.join(ROOT, "ml", "parity_fixtures.json")

# Column index -> substring expected (case-insensitively) in that column's
# header. Every column `encode.GROUPS` reads by index is checked here so a
# CSV re-exported with reordered columns fails loudly instead of silently
# training on misaligned data (X and y would still be internally consistent,
# so the CV score alone can't catch this).
EXPECTED_HEADER_SUBSTRINGS = {
    4: "type of secondary school",
    5: "which stream",
    6: "spm results",
    7: "enjoy most",
    8: "most difficult",
    9: "your personality",
    10: "type of tasks",
    11: "your characteristics",
    12: "public speaking",
    13: "pre-university",
    14: "major",
}


def load_rows():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        raw = [r for r in reader if any(c.strip() for c in r)]

    # Guard against silent column drift.
    assert "gender" in header[1].lower(), f"unexpected header: {header[1]!r}"
    for idx, substring in EXPECTED_HEADER_SUBSTRINGS.items():
        actual = header[idx] if idx < len(header) else ""
        assert substring in actual.strip().lower(), (
            f"column drift at index {idx}: expected header to contain "
            f"{substring!r}, got {actual!r}"
        )

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
        # Equal weights, changed from [2,2,1,1] on 2026-07-30.
        #
        # Not a hunch. An unpaired sweep of nine variants put equal weights
        # +1.55pp ahead, which at n=207 is inside the noise and would normally
        # be dismissed — the 74.4% single-seed artefact earlier in this project
        # is exactly what chasing a difference that size looks like.
        #
        # So it was re-tested PAIRED: both configurations on identical folds,
        # 12 repeats. Equal weights won 10 and tied 2, never losing, for a mean
        # paired difference of +1.13pp (sd 0.63, sem 0.18, t = 6.20). Pairing
        # removes the fold-to-fold variance that swamped the first comparison,
        # which is why a real effect could hide inside it.
        #
        # By path (ml/measure_paths.py): the gain is on the direct path,
        # 70.0% -> 71.5% with a stated pre-U route, and neutral on the
        # marginalised path, 63.9% -> 63.7%. Reported as both, never as one.
        weights=[1, 1, 1, 1],
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


def _with_valid_categoricals(answers, spec):
    """Copy of `answers` where every categorical group has at least one
    option drawn from spec['groups'] options (numeric groups untouched).

    Never invents values: if the source answer already names a valid option
    it's kept, otherwise the group's first spec option is used.
    """
    out = dict(answers)
    for g in spec["groups"]:
        if g["type"] == "num":
            continue
        opts = g["options"]
        if not opts:
            continue
        current = out.get(g["key"])
        if g["type"] == "multi":
            valid = [v for v in (current or []) if v in opts]
            out[g["key"]] = valid or [opts[0]]
        elif current not in opts:
            out[g["key"]] = opts[0]
    return out


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

    # The eight cases above leave `speaking` almost entirely null and never
    # exercise a fully-populated row, an omitted optional field, or an
    # unseen value inside a multi-select. Add four cases that do, built
    # explicitly (never hand-computed vectors) so the JS mirror is held to
    # the same numeric-scaling and omission behaviour.
    fully_populated = _with_valid_categoricals(
        {k: v for k, v in rows[0].items() if k != "field"}, spec
    )
    fully_populated["speaking"] = 3
    cases.append({"answers": dict(fully_populated)})              # mid-range numeric, all groups populated

    preu_omitted = dict(fully_populated)
    del preu_omitted["preu"]
    cases.append({"answers": preu_omitted})                        # optional field omitted entirely

    unseen_multi = dict(fully_populated)
    unseen_multi["stream"] = ["Not A Real Stream"]
    cases.append({"answers": unseen_multi})                        # unseen value in a multi-select

    boundary = dict(fully_populated)
    boundary["speaking"] = 1
    cases.append({"answers": boundary})                            # numeric lower boundary (-> 0.2)

    # `float("")` raises ValueError in Python (defaults to the midpoint) but
    # naive `Number("")` is 0 in JavaScript, not NaN — a live bug because a
    # controlled numeric <input> initialises to "" in React. Pin it.
    blank_speaking = dict(fully_populated)
    blank_speaking["speaking"] = ""
    cases.append({"answers": blank_speaking})                      # blank numeric string (-> midpoint 0.6)

    # `float([5])` raises TypeError in Python (defaults to the midpoint 0.6)
    # while naive `Number([5])` coerces to 5 in JavaScript (-> 1.0). Unlike
    # speaking: [3] (which coincidentally lands on the midpoint either way,
    # since 3 IS the midpoint of [1, 5]), this value makes the two encoders
    # genuinely disagree unless JS explicitly rejects arrays for num groups.
    list_speaking = dict(fully_populated)
    list_speaking["speaking"] = [5]
    cases.append({"answers": list_speaking})                       # single-element list (-> midpoint 0.6)

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
