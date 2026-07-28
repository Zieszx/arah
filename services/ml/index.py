"""Vercel Python function: rank fields of study for a student's answers.

The model is loaded once into a module-level global and reused across
invocations — on Fluid Compute the instance stays warm, so this cost is paid
roughly once rather than per request.
"""
import json
import os
import sys
import traceback

import joblib
import numpy as np

import encode

_BUNDLE = None
_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "model.joblib",
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


# --- ASGI entrypoint -------------------------------------------------------
# Vercel Services expects a callable app, not a BaseHTTPRequestHandler class.
# This is plain ASGI with no framework dependency, keeping the bundle small.


_MAX_BODY_BYTES = 1024 * 1024  # 1 MB; a quiz submission is well under 10 KB.


async def _read_body(receive):
    body = b""
    while True:
        message = await receive()
        body += message.get("body", b"") or b""
        if len(body) > _MAX_BODY_BYTES:
            return None
        if not message.get("more_body"):
            break
    return body


async def app(scope, receive, send):
    if scope["type"] != "http":
        return

    status, payload = 405, {"error": "method not allowed"}
    try:
        method = scope.get("method", "GET").upper()
        if method == "GET":
            payload = {"status": "ok", "model_version": load()["spec"]["version"]}
            status = 200
        elif method == "POST":
            body = await _read_body(receive)
            if body is None:
                status, payload = 400, {"error": "body too large"}
            else:
                try:
                    data = json.loads(body or b"{}")
                except ValueError:
                    data = None
                if not isinstance(data, dict):
                    status, payload = 400, {"error": "body must be valid JSON"}
                else:
                    answers = data.get("answers")
                    if not isinstance(answers, dict):
                        status, payload = 400, {"error": 'body must be {"answers": {...}}'}
                    else:
                        status, payload = 200, predict(answers)
    except Exception:  # noqa: BLE001
        # Log the full detail where only we can see it; return nothing useful
        # to the caller. This is a public endpoint.
        print(traceback.format_exc(), file=sys.stderr)
        status, payload = 500, {"error": "prediction_failed"}

    out = json.dumps(payload).encode("utf-8")
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(out)).encode()),
        ],
    })
    await send({"type": "http.response.body", "body": out})
