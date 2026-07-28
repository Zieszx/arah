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


def test_min_option_count_boundary_drops_four_keeps_five():
    """MIN_OPTION_COUNT is 5. In the real survey data every dropped option has
    count 1 and every kept option has count >= 7, so nothing in the real data
    pins the threshold anywhere between 2 and 7 (n_features == 55 would pass
    for any of those values). Place synthetic options at exactly 4 and
    exactly 5 to pin the boundary precisely.
    """
    rows = []
    for i in range(5):
        rows.append({
            "stream": ["Kept At Five"],
            "enjoyed": [], "difficult": [], "tasks": [], "traits": [],
            "personality": "Introvert", "results": "9+ As", "preu": "STPM",
            "school": "Public", "speaking": 3, "field": "Science & Mathematics",
        })
    for i in range(4):
        rows.append({
            "stream": ["Dropped At Four"],
            "enjoyed": [], "difficult": [], "tasks": [], "traits": [],
            "personality": "Introvert", "results": "9+ As", "preu": "STPM",
            "school": "Public", "speaking": 3, "field": "Science & Mathematics",
        })
    spec = encode.build_spec(rows)
    stream = next(g for g in spec["groups"] if g["key"] == "stream")
    assert "Kept At Five" in stream["options"]
    assert "Dropped At Four" not in stream["options"]


def test_build_spec_preu_priors_has_keys_and_counts():
    rows = [
        {"stream": [], "enjoyed": [], "difficult": [], "tasks": [], "traits": [],
         "personality": "Introvert", "results": "9+ As", "preu": "STPM",
         "school": "Public", "speaking": 3, "field": "Science & Mathematics"}
        for _ in range(3)
    ] + [
        {"stream": [], "enjoyed": [], "difficult": [], "tasks": [], "traits": [],
         "personality": "Introvert", "results": "9+ As", "preu": "Diploma",
         "school": "Public", "speaking": 3, "field": "Science & Mathematics"}
        for _ in range(2)
    ]
    spec = encode.build_spec(rows)
    assert spec["preu_priors"] == {"STPM": 3, "Diploma": 2}


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


_NUM_SPEC = {
    "version": "t",
    "groups": [{"key": "speaking", "type": "num", "min": 1, "max": 5}],
    "classes": [],
}
_CAT_SPEC = {
    "version": "t",
    "groups": [{"key": "personality", "type": "single", "options": ["Introvert", "Extrovert"]}],
    "classes": [],
}


def test_out_of_range_numeric_is_clamped_not_extrapolated():
    assert encode.encode_answers({"speaking": 1_000_000_000}, _NUM_SPEC) == [1.0]
    assert encode.encode_answers({"speaking": -99}, _NUM_SPEC) == [0.2]


def test_non_finite_numeric_defaults_to_midpoint():
    assert encode.encode_answers({"speaking": float("inf")}, _NUM_SPEC) == [0.6]
    assert encode.encode_answers({"speaking": float("nan")}, _NUM_SPEC) == [0.6]


def test_numeric_strings_never_coerced():
    for hostile in ("Infinity", "0x10", "0b101", "1_0", "٤", "３"):
        assert encode.encode_answers({"speaking": hostile}, _NUM_SPEC) == [0.6]


def test_bool_is_not_treated_as_numeric():
    assert encode.encode_answers({"speaking": True}, _NUM_SPEC) == [0.6]


def test_dict_in_categorical_is_inert_not_a_crash():
    assert encode.encode_answers({"personality": {"x": 1}}, _CAT_SPEC) == [0.0, 0.0]
    assert encode.encode_answers({"personality": [["x"]]}, _CAT_SPEC) == [0.0, 0.0]


def test_validate_answers_rejects_out_of_range_and_bad_type():
    ok, errors = encode.validate_answers({"speaking": 1_000_000_000}, _NUM_SPEC)
    assert ok is False and "speaking" in errors

    ok, errors = encode.validate_answers({"speaking": "Infinity"}, _NUM_SPEC)
    assert ok is False and "speaking" in errors

    ok, errors = encode.validate_answers({"speaking": 3}, _NUM_SPEC)
    assert ok is True and errors == {}


def test_validate_answers_rejects_unknown_and_too_many():
    ok, errors = encode.validate_answers({"personality": "Not A Real Option"}, _CAT_SPEC)
    assert ok is False and "personality" in errors

    multi_spec = {
        "version": "t",
        "groups": [{"key": "stream", "type": "multi", "max_select": 2,
                    "options": ["A", "B", "C"]}],
        "classes": [],
    }
    ok, errors = encode.validate_answers({"stream": ["A", "B", "C"]}, multi_spec)
    assert ok is False and "stream" in errors
    ok, errors = encode.validate_answers({"stream": ["A", "B"]}, multi_spec)
    assert ok is True
