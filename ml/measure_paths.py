"""Measure top-3 accuracy on BOTH prediction paths, plus the naive baseline.

These are the three numbers the product publishes, so they need a committed,
re-runnable script rather than an ad-hoc measurement someone did once:

  with a stated pre-U route  -- the direct path, pre-U answered
  without one yet            -- the marginalised path, averaged over routes
  naive baseline             -- always guess the three most common fields

The marginalised path is reproduced from services/ml/index.py#predict exactly:
predict once per pre-U option, average weighted by preu_priors. If that
function ever changes, this must change with it or the published figure stops
describing what the service actually does.

Both paths are scored with the SAME repeated stratified CV as train.py, so the
figures are comparable to its headline and to each other.

Run: python ml/measure_paths.py [--weights 1,1,1,1]
"""
import argparse
import csv
import os
import sys

import numpy as np
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import BernoulliNB
from sklearn.neighbors import KNeighborsClassifier

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "services", "ml"))
import encode  # noqa: E402

CSV_PATH = os.path.join(ROOT, "ml", "data", "survey.csv")
CV_FOLDS = 5
CV_REPEATS = 5


def load_rows():
    with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        raw = [r for r in reader if any(c.strip() for c in r)]
    rows = []
    for r in raw:
        a = encode.row_to_answers(r)
        a["field"] = r[encode.FIELD_COL].strip()
        if a["field"]:
            rows.append(a)
    return rows


def build_estimator(weights):
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
        weights=list(weights),
    )


def top3_direct(model, rows_te, spec):
    """Pre-U answered: one vector per row, straight through the model."""
    X = np.array([encode.encode_answers(r, spec) for r in rows_te], dtype=float)
    proba = model.predict_proba(X)
    order = np.argsort(-proba, axis=1)
    hits = 0
    for i, r in enumerate(rows_te):
        if r["field"] in model.classes_[order[i]][:3]:
            hits += 1
    return hits, len(rows_te)


def top3_marginalised(model, rows_te, spec):
    """Pre-U withheld: average over every route, weighted by preu_priors.

    Mirrors services/ml/index.py#predict's else-branch. The pre-U answer is
    removed from the row, not left blank in some other way, so this measures
    the situation the product actually reports as `marginalised: true`.
    """
    preu_group = next(g for g in spec["groups"] if g["key"] == "preu")
    opts = preu_group["options"]
    priors = spec.get("preu_priors", {})
    weights = np.array([priors.get(o, 1) for o in opts], dtype=float)
    weights /= weights.sum()

    hits = 0
    for r in rows_te:
        vectors = []
        for o in opts:
            a = dict(r)
            a["preu"] = o
            vectors.append(encode.encode_answers(a, spec))
        probas = model.predict_proba(np.array(vectors, dtype=float))
        proba = np.average(probas, axis=0, weights=weights)
        order = np.argsort(-proba)
        if r["field"] in model.classes_[order][:3]:
            hits += 1
    return hits, len(rows_te)


def naive_baseline(rows):
    """Always name the three most common fields. The number to beat."""
    counts = {}
    for r in rows:
        counts[r["field"]] = counts.get(r["field"], 0) + 1
    top3 = [f for f, _ in sorted(counts.items(), key=lambda kv: -kv[1])[:3]]
    hits = sum(1 for r in rows if r["field"] in top3)
    return hits / len(rows) * 100.0


def summarise(scores):
    mean = sum(scores) / len(scores)
    var = sum((s - mean) ** 2 for s in scores) / (len(scores) - 1)
    return mean, var ** 0.5


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--weights", default="1,1,1,1",
                        help="voting weights, e.g. 2,2,1,1")
    args = parser.parse_args()
    weights = [float(w) for w in args.weights.split(",")]

    rows = load_rows()
    spec = encode.build_spec(rows)
    X = np.array([encode.encode_answers(r, spec) for r in rows], dtype=float)
    y = np.array([r["field"] for r in rows])

    print(f"{len(rows)} rows, {spec['n_features']} features, "
          f"{len(spec['classes'])} classes, weights {weights}")

    direct_scores, marg_scores = [], []
    for rep in range(CV_REPEATS):
        skf = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True,
                              random_state=100 + rep)
        dh = dt = mh = mt = 0
        for tr, te in skf.split(X, y):
            model = build_estimator(weights).fit(X[tr], y[tr])
            rows_te = [rows[i] for i in te]
            h, t = top3_direct(model, rows_te, spec)
            dh += h
            dt += t
            h, t = top3_marginalised(model, rows_te, spec)
            mh += h
            mt += t
        direct_scores.append(dh / dt * 100.0)
        marg_scores.append(mh / mt * 100.0)

    dm, dsd = summarise(direct_scores)
    mm, msd = summarise(marg_scores)
    base = naive_baseline(rows)

    print()
    print(f"with a stated pre-U route : {dm:.1f}%  +/- {dsd:.1f}")
    print(f"without one yet           : {mm:.1f}%  +/- {msd:.1f}")
    print(f"naive baseline            : {base:.1f}%")
    print()
    print(f"({CV_FOLDS} folds x {CV_REPEATS} repeats; "
          f"direct range {min(direct_scores):.1f}-{max(direct_scores):.1f}, "
          f"marginalised range {min(marg_scores):.1f}-{max(marg_scores):.1f})")


if __name__ == "__main__":
    main()
