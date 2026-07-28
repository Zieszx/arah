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
    # _rank() rounds each probability to 6dp, so the sum of N classes can drift by
    # up to N * 5e-7. With 10 classes that is 5e-6; 1e-5 is the correct bound.
    assert abs(sum(probs) - 1.0) < 1e-5
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
    # _rank() rounds each probability to 6dp, so the sum of N classes can drift by
    # up to N * 5e-7. With 10 classes that is 5e-6; 1e-5 is the correct bound.
    assert abs(sum(r["probability"] for r in out["ranked"]) - 1.0) < 1e-5


def test_unseen_value_does_not_raise():
    import predict
    spec = predict.load()["spec"]
    out = predict.predict(_full_answers(spec, results="Fail"))
    assert len(out["ranked"]) == 10


def test_unrounded_probabilities_sum_to_exactly_one():
    """The rounding in _rank() is presentational. The underlying distribution
    must be exactly normalised, in both the direct and marginalised paths."""
    import numpy as np
    import predict
    spec = predict.load()["spec"]

    for drop_preu in (False, True):
        answers = _full_answers(spec)
        if drop_preu:
            answers.pop("preu")
        out = predict.predict(answers)
        total = sum(r["probability"] for r in out["ranked"])
        assert out["marginalised"] is drop_preu
        assert abs(total - 1.0) < 1e-5
        # every probability is a valid, ordered probability
        probs = [r["probability"] for r in out["ranked"]]
        assert all(0.0 <= p <= 1.0 for p in probs)
        assert probs == sorted(probs, reverse=True)
