# Where ARAH's data comes from, and what it would take to add more

Written because the obvious next question is "can we make the model better by
finding more data online?" The short answer is no, and the reason matters
enough to write down rather than quietly not do it.

## What the model is trained on

One source: `ml/data/survey.csv`, 207 responses to the 2025 Post-SPM Academic
Pathway and Interest Survey. Each row is one real person who answered ten
questions about themselves **and** told us which field they went on to study
and how satisfied they were with it.

That pairing is the whole asset. The model learns "answers like these led to
that field" — so a usable training row must contain both halves, from the same
individual.

## What is available publicly, and why it does not help

The Ministry of Higher Education publishes national statistics annually
([MoHE Statistics](https://www.mohe.gov.my/en/download/statistics)) — total
enrolment, intake and output broken down by field of study. As of 31 December
2025 the reported total was 1,264,541 students across public and private
institutions, of whom 159,138 (12.6%) were international.

This is real, authoritative data. It is also the wrong shape:

- **It is aggregate, not individual.** It reports how many people are enrolled
  in each field. It contains no information about what any of those people
  answered to anything, so it cannot produce a single training row. A model
  that maps answers to fields cannot learn from counts of fields alone.
- **The population does not match.** National enrolment spans international
  students, every study level, and every intake year. ARAH predicts for
  Malaysian SPM leavers specifically.
- **Using it to shift class priors would probably hurt.** It is technically
  possible to reweight the model's classes toward national field popularity.
  But at n=207 the measured accuracy already carries roughly a ±6 point
  confidence interval, so such a change could not be validated as an
  improvement — it would be a change made on faith, to a system that gives
  teenagers advice about their education.

## The public datasets, checked by name

Asked twice, so checked concretely rather than dismissed on principle. What is
actually on Kaggle under "career prediction":

| Dataset | Why it cannot be used |
| --- | --- |
| Computer Science Students Career Prediction | Its own description says the students are from a **fictional university** |
| Career Prediction Dataset | Numerical and spatial **aptitude test scores** — a different instrument entirely, with no SPM data |
| Career Path Prediction for Different Fields | Non-Malaysian population, generic field taxonomy |
| Job Description Dataset | Generated with **Faker**, a library whose only purpose is producing fake records |

Provenance aside, there is a harder problem: **no overlap on the questions
that matter.** Our model reads ten inputs, and every one is Malaysia-specific:

| Our model needs | Present in those datasets |
| --- | --- |
| SPM stream (Sains, Perniagaan, Islamic Studies…) | no |
| SPM results band ("6 – 8 As") | no — GPA or aptitude scores instead |
| Pre-U route (STPM, Matrikulasi, Foundation) | no |
| School type (SMK, SBP/MRSM) | no |
| Malaysian subject groupings | no |

Merging would mean inventing an SPM stream and a results band for every
foreign record. That is not importing data; it is manufacturing respondents,
and the accuracy figure would then measure how well the model had learned an
invention.

## A real option, for detail rather than accuracy

The **MOHE Graduate Tracer Study** (*Kajian Pengesanan Graduan*) is genuine,
compulsory, published Malaysian data: employment status, time to employment,
starting salary, and whether the job matched the field. It answers the
question a student asks *next* — "what happens after I study this?"

It would belong beside the prediction on each field page, cited to MoHE with
the year, and never inside the model. Not built at handover: the per-field
breakdowns live in published PDFs that were not machine-read, and estimating
them from headline figures would be the same fabrication this document rejects
everywhere else.

Verified headline figures only, for whoever picks this up:
84.4% graduate employability (2020, down from 86.2%), and 66.6% of graduates
working in a field related to their study.

## What must not be done

**Synthetic respondents.** It is easy to generate a few thousand plausible
rows that match published national distributions, and doing so would look like
progress: the corpus would grow and the confidence interval would narrow. It
would also be a lie. The model would be learning the assumptions of whoever
wrote the generator, the reported accuracy would measure how well it had
learned those assumptions, and every honest number on the site — "44 of the
207 students most like you", the suppression notices, both accuracy figures —
would silently become fiction.

The whole product rests on the claim that these are real students. That claim
is worth more than a better-looking accuracy number.

## What actually improves the model

More real pairings. There is exactly one mechanism for that and it already
exists:

1. A new alumnus outcome is recorded as a verified `alumni_profiles` row.
2. `npm run export:training` appends it to the corpus.
3. A human retrains and reads the new score — see [RETRAINING.md](./RETRAINING.md).

Step 1 used to be a form: an alumnus submitted through `/contribute` and an
admin approved it from a moderation queue. Both were removed at the client's
request, so a row now arrives by an admin inserting it directly. What has not
changed is the requirement behind it — the row must describe a real person who
actually made the choice, because that is the claim the whole product rests on.

Everything else is a distribution to compare against, not data to learn from.

## Sensible uses for the published statistics

They are good for **context**, clearly attributed, on the public pages: "X% of
Malaysian students nationally enrol in this field" sits usefully next to "N of
our 207 alumni chose it", precisely because the two numbers are different
things. That is a copy and citation exercise, not a modelling one, and it must
name MoHE and the year on the page — an uncited national figure next to our
own is indistinguishable from us having made it up.

## Model tuning on the existing data

Worth recording so nobody repeats it hopefully. Nine ensemble variants were
scored against the shipped configuration using the same repeated stratified
CV (5 folds × 5 repeats), on the same 207 rows:

| variant | top-3 | vs shipped |
| --- | --- | --- |
| shipped `[2,2,1,1]` | 69.95% | — |
| equal weights `[1,1,1,1]` | 71.50% | +1.55pp |
| LogisticRegression `C=0.5` | 70.92% | +0.97pp |
| KNN `k=25` | 70.53% | +0.58pp |
| weights `[2,3,1,1]` | 70.34% | +0.39pp |
| + ExtraTrees | 70.34% | +0.39pp |
| BernoulliNB `alpha=1.0` | 70.24% | +0.29pp |
| KNN `k=9` | 69.57% | −0.39pp |
| weights `[3,2,1,1]` | 69.08% | −0.87pp |

Every difference sits inside the noise for this sample size. The apparent
1.55pp gain from equal weights was re-tested as a paired comparison over more
repeats before any decision was taken — see the commit that records the
outcome. The lesson is the same one the 74.4% single-seed artefact taught
earlier in this project: at n=207, small differences are seeds, not
improvements.

## Sources

- [MoHE — Higher Education Statistics](https://www.mohe.gov.my/en/download/statistics)
- [MoHE — Statistik Pendidikan Tinggi 2024](https://www.mohe.gov.my/en/download/statistics/2024-4)
- [MoHE — Statistik Pendidikan Tinggi 2025](https://www.mohe.gov.my/en/download/statistics/2025-1-1/1852-0-3-isi-kandungan-2025-pdf/file)
- [StudyMalaysia — 14 study pathways after SPM](https://studymalaysia.com/education/top-stories/14-study-pathways-after-spm)
