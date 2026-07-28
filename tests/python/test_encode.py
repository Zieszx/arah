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
