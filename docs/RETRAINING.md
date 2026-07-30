# Retraining ARAH's model

Who this is for: whoever maintains ARAH after handover. It answers one
question — *when a student contributes their outcome, how does that ever
reach the model?*

## What feeds what

There are two separate paths, and it matters that they are separate.

| Action | Lands in | Affects the ranking? |
| --- | --- | --- |
| A student answers `/questions` | `quiz_responses` + `predictions` | **No.** Prediction only. |
| An alumnus submits `/contribute` | `alumni_profiles`, `verified: false` | Not until approved. |
| An admin approves it | `verified: true` | Statistics only — see below. |
| Someone runs the retrain loop | `ml/data/survey.csv` → `model.joblib` | **Yes.** |

**Student answers are never training data.** This is deliberate: a student
tells us what they *want*, not what they *did*, and the model is trained on
outcomes. Feeding predictions back into training would make the model
progressively more confident in its own guesses — the ranking would drift
toward whatever it already believed, with nothing external correcting it.
Only `/contribute` collects an outcome, and only from someone who already
made the choice.

## What approval does on its own

Setting `verified: true` fires `field_stats_refresh_on_verify`
(`supabase/migrations/0009_field_stats_hardening.sql`), which refreshes the
published aggregates — but only once the verified count for that field has
moved by **≥3 rows** since the last refresh. That gate is a privacy control,
not a performance one: refreshing on every single approval would let someone
who knows the previous numbers subtract them and recover one individual's
answers.

So approval updates:

- the "N of 207 students…" sentences and confidence tiers,
- average satisfaction and the banded distributions on `/explore/<field>`.

It does **not** touch the ranking. Those probabilities come from
`services/ml/model.joblib`, a file fitted offline and bundled into the
deployed Python service.

## The retrain loop

Four steps. Only the first is automated.

```bash
npm run export:training     # 1. append approved contributions to the CSV
python ml/train.py          # 2. refit; aborts below the 66.0% top-3 CV floor
python ml/measure_paths.py  # 3. both published figures, plus the baseline
                            # 4. commit the artefacts, then redeploy
```

`measure_paths.py` is the script behind the two numbers on the site. Run it
after every retrain and update `lib/i18n/en.js` if they moved — a stale
accuracy claim is the one kind of bug this project cannot ship.

**Step 1** (`scripts/export-training-csv.mjs`) appends verified
`alumni_profiles` rows that are not already in `ml/data/survey.csv`. It
appends rather than regenerates, so existing rows stay byte-identical and the
diff shows only what is new. Re-running it when nothing has been approved is a
no-op that writes nothing.

**Step 2** refits the ensemble and rewrites `services/ml/feature_spec.json`,
`services/ml/model.joblib` and `ml/parity_fixtures.json`. It refuses to write
anything if repeated cross-validation lands below 66.0% top-3.

**Step 3 is a human judgement and cannot be skipped.** Passing the floor is not
the same as being better. Compare against the current figures — 71.5% top-3
with a stated pre-U route, 63.7% without, against a 49.3% most-popular-field
baseline. Confidence interval is roughly ±6pp at n=207, so a 1–2pp move is
noise, not improvement. If accuracy dropped meaningfully, do not ship it;
`git checkout` the artefacts and work out why first.

**Step 4** commits `ml/data/survey.csv`, `services/ml/model.joblib`,
`services/ml/feature_spec.json` and `ml/parity_fixtures.json` together — they
are one unit and a mismatched spec/model pair is rejected at load time — then
redeploys.

## Why this is not a cron job

The design spec described a scheduled retraining job. It is intentionally not
built, and should not be bolted on casually:

- A model change is a **behaviour change** to advice given to teenagers about
  their education. It belongs in a reviewed commit with a name attached.
- `model.joblib` is a committed artefact baked into the service bundle, so an
  automated retrain would have to commit and deploy on its own.
- At n=207 a handful of new rows can move the score by more than the noise
  floor. A human reading the number is currently the only thing standing
  between a bad batch and a worse model.

Revisit this when the corpus is large enough that a single batch cannot move
the score much — several thousand rows, not several hundred. Until then the
manual gate is the feature.

## Guardrails you will hit

- **Column drift.** `ml/train.py` asserts a substring per column index
  (`EXPECTED_HEADER_SUBSTRINGS`). Reordering the CSV fails loudly rather than
  training on misaligned data, which cross-validation alone cannot detect —
  X and y stay internally consistent, so the score looks fine.
- **Encoder parity.** `ml/parity_fixtures.json` pins the JS encoder in
  `lib/features.js` to the Python one in `services/ml/encode.py`. If they
  diverge, the browser and the model disagree about what a student said.
- **Accuracy floor.** 66.0% top-3, enforced in `train.py`.
- **Duplicate guard.** The export matches rows on normalised content, so a
  contribution cannot be appended twice — covered by
  `tests/js/training-csv.test.js`.
