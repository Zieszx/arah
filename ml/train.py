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
