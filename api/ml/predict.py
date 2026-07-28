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
