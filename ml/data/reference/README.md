# Reference data — context only, never training data

**Nothing in this folder is read by `ml/train.py`.** It is deliberately a
sibling directory, not extra rows in `../survey.csv`, and the training script
has a hardcoded path to that one file. If a future change makes anything here
reachable from training, that change is a bug.

## Why it is kept apart

The model learns from **paired** records: what one person answered, and which
field that same person went on to study. Every row in `../survey.csv` is one
real individual who supplied both halves.

Everything in this folder is **aggregate** — national totals published by the
Ministry of Higher Education. Aggregates contain no information about what any
individual answered, so they cannot produce a training row. Splitting a
national total into plausible-looking individuals would manufacture people who
do not exist, and the model would then be learning the assumptions of whoever
wrote the generator while reporting an accuracy figure that measured nothing
real. See [`docs/DATA-SOURCES.md`](../../../docs/DATA-SOURCES.md) for the
longer argument.

## What it is for

Context a reader can compare our sample against, always attributed on screen:

> 44 of our 207 alumni chose this field. Nationally, MoHE reported N students
> enrolled in it in 2025.

Two different measurements, useful precisely because they are different. An
uncited national figure printed next to our own is indistinguishable from us
having invented it, so anything used from here must name the source and year
at the point of display.

## Files

| File | Contents | Source |
| --- | --- | --- |
| `mohe-enrolment-2025.csv` | National higher-education enrolment as at 31 Dec 2025, by segment | MoHE, reported July 2026 |

## Provenance and limits

The figures in `mohe-enrolment-2025.csv` were transcribed from a July 2026
report of the Ministry's own statement. Every value is quoted exactly as
published; nothing is derived, interpolated or rounded here.

Two limits worth stating before anyone reaches for these numbers:

1. **The population is not ours.** National enrolment spans international
   students (12.6% of the total), every study level, and every intake year.
   ARAH predicts for Malaysian SPM leavers choosing a first pathway.
2. **There is no field-of-study breakdown in this file.** MoHE does publish
   intake, enrolment and output by field in the full annual statistics, but
   those live in per-chapter PDFs that were not machine-read for this file.
   Adding them means transcribing from the published chapter and citing the
   exact table — not estimating them from the totals here.

## Sources

- [MoHE — Higher Education Statistics (all years)](https://www.mohe.gov.my/en/download/statistics)
- [MoHE — Statistik Pendidikan Tinggi 2025](https://www.mohe.gov.my/en/download/statistics/2025-1-1/1852-0-3-isi-kandungan-2025-pdf/file)
- [MoHE — Statistik Pendidikan Tinggi 2024](https://www.mohe.gov.my/en/download/statistics/2024-4)
- [Reported figures, July 2026](https://mediaselangor.com/en/2026/07/382860)
