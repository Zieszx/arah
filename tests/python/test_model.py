import json
import os
import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL = os.path.join(ROOT, "services", "ml", "model.joblib")
SPEC = os.path.join(ROOT, "services", "ml", "feature_spec.json")
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
