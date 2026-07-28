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
