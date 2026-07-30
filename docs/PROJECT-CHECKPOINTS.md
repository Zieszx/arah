# ARAH — delivery checkpoints

Everything built, in the order it was built, with the state at handover.

**Live:** https://arah-sand.vercel.app
**As at:** 30 July 2026 · 96 commits · 398 JavaScript + 36 Python tests passing

Legend: **✅ done and verified** · **⚠️ known limitation, documented** ·
**⛔ deliberately not done, with a reason**

---

## 1 · Data & research

| | Checkpoint |
| --- | --- |
| ✅ | 207-response post-SPM survey studied and mapped to ten predictive questions |
| ✅ | Ten fields of study defined as the outcome classes |
| ✅ | Survey loaded into the database and into the training corpus |
| ✅ | Ministry of Higher Education national figures researched, transcribed with sources, and seeded as **context only** |
| ⛔ | **No third-party dataset used.** Public career-prediction datasets evaluated and rejected — synthetic, or from fictional institutions, and none carries the Malaysian SPM questions. Reasoning in `DATA-SOURCES.md` |
| ⛔ | **No synthetic rows generated.** Padding the corpus would improve the numbers on paper while making them describe nothing real |

---

## 2 · Machine learning

| | Checkpoint |
| --- | --- |
| ✅ | Feature encoder: ten answers → 55 numbers |
| ✅ | Encoder mirrored in JavaScript and pinned to the Python one by fixture tests |
| ✅ | Four-model soft-voting ensemble (nearest neighbours, logistic regression, random forest, naive Bayes) |
| ✅ | Marginalisation for students with no pre-university route — averaged across routes, never guessed |
| ✅ | Training pipeline with a 66% accuracy floor that aborts rather than shipping a worse model |
| ✅ | Both accuracy figures measured by a committed, re-runnable script (`ml/measure_paths.py`) |
| ✅ | Voting weights improved after a **paired** significance test: 10 wins, 2 ties, 0 losses over 12 repeats |
| ✅ | Retraining procedure documented, and the export step that was missing was built |
| ⚠️ | Accuracy carries roughly ±6 points of margin at n=207. More real responses is the only honest way to narrow it |

**Published accuracy:** 71.5% with a stated pre-U route · 63.7% without ·
49.3% naive baseline. Both figures appear in the product.

---

## 3 · Database & privacy

| | Checkpoint |
| --- | --- |
| ✅ | 11 migrations, applied in order |
| ✅ | Row Level Security — a student can read only their own answers |
| ✅ | Admin access locked at the database grant layer, not only in the app |
| ✅ | k-anonymity: fields with fewer than 10 students publish no statistics |
| ✅ | Sample sizes shown as ranges, never exact counts |
| ✅ | Refresh gating (≥3 rows) closing a temporal-differencing channel |
| ✅ | Account deletion removes answers and results, verified by row counts |
| ✅ | Restorable database export — schema and data |
| ⛔ | The export **excludes** student accounts, answers and results. A dump travels too easily for personal data to be in it |

---

## 4 · Student application

| | Checkpoint |
| --- | --- |
| ✅ | Landing page with the headline finding from the data |
| ✅ | Ten-question flow, about three minutes |
| ✅ | Ranked results with sample size and confidence per field |
| ✅ | Field explorer, and a detail page per field |
| ✅ | Contribution form for alumni to give back their outcome |
| ✅ | Privacy page stating exactly what is stored and who can see it |
| ✅ | Sign-up and sign-in, with a password reveal toggle |
| ✅ | Account area: display name, email and password all self-service |
| ✅ | Account deletion |
| ✅ | Responsive 320px → 1920px |
| ✅ | Loading states on all 10 route groups |

---

## 5 · Administration console

| | Checkpoint |
| --- | --- |
| ✅ | Overview — live counts and model accuracy |
| ✅ | Response Charts — every question summarised, Google-Forms style |
| ✅ | Survey Data — the 207-row corpus, searchable and sortable |
| ✅ | Student Responses — every submission with its prediction |
| ✅ | Contributions — moderation queue with approve/reject |
| ✅ | People — accounts, display names, admin access |
| ✅ | Algorithm Tester — enter answers by hand, watch the model rank live |
| ✅ | Server-side pagination, search and sorting throughout |
| ✅ | Sidebar navigation, responsive to 320px |
| ✅ | Two lock-outs guarded in the data layer: an admin cannot demote themselves, and the last admin cannot be demoted |
| ⚠️ | The Disagreements filter is a fingerprint match, not an exact join. Accepted deliberately — the exact version would break the privacy promise. See `KNOWN-ISSUES.md` #3 |

---

## 6 · Quality

| | Checkpoint |
| --- | --- |
| ✅ | 398 JavaScript tests |
| ✅ | 36 Python tests |
| ✅ | ESLint clean |
| ✅ | Production build clean |
| ✅ | Encoder parity pinned across two languages |
| ✅ | Privacy rules covered by tests that fail if a published number gets more precise |
| ✅ | Admin privilege guards tested, including that promotion is never blocked |
| ✅ | Student journey verified end to end against production |
| ✅ | Role separation verified live — student blocked from all seven admin routes |
| ✅ | Credential change cycle verified, including that the old password stops working |

---

## 7 · Performance

| Route | Before | After |
| --- | --- | --- |
| `/explore` | 1204ms | **311ms** |
| `/explore/<field>` | 1465ms | **316ms** |
| `/login` | 1072ms | **301ms** |

| | Checkpoint |
| --- | --- |
| ✅ | Public aggregates cached, with moderation clearing the cache immediately |
| ✅ | Canvas backdrop lazy-loaded, and skipped entirely on admin pages |
| ✅ | Menu click feedback: 579ms → **102ms**; `/contribute` went from no feedback at all to 64ms |

---

## 8 · Deployment

| | Checkpoint |
| --- | --- |
| ✅ | Two services from one repository — Next.js and a Python inference service |
| ✅ | Custom domain aliased |
| ✅ | All 19 routes verified: public 200, protected 307 |
| ✅ | Prediction API verified live |

---

## 9 · Handover materials

| | Checkpoint |
| --- | --- |
| ✅ | Technical README |
| ✅ | `PREDICTIVE-ANALYSIS.md` — how the prediction works, in plain language |
| ✅ | `RETRAINING.md` — how a contribution reaches the model |
| ✅ | `DATA-SOURCES.md` — where data comes from, and what was rejected |
| ✅ | `KNOWN-ISSUES.md` — what is open, stated plainly |
| ✅ | Pitch deck and 14-slide technical overview, both regenerable from source |
| ✅ | Quotation |
| ✅ | Delivery folder: source, datasets, database export, presentations, credentials |

---

## 10 · Bugs found by using the system

None of these were caught by the test suite. Every one was found by a person
looking at the screen — which is the honest argument for a human pass before
launch.

| Bug | Cause |
| --- | --- |
| ✅ `/explore` would not scroll past a point | A required stylesheet was never imported |
| ✅ Header text ghosting through the nav bar | Opacity carried over from the dark theme |
| ✅ Two headers and three logos on admin pages | A root layout does not re-render on client navigation |
| ✅ Explore cards ended a row at three different heights | The card was not filling its grid cell |
| ✅ Heading styles silently ignored site-wide | Unlayered CSS outranks every Tailwind utility |
| ✅ **"20–49 of the 16 students"** on the results page | Summed a column that only survives on suppressed fields — and leaked the withheld total |
| ✅ Footer linked to `/privacy`, which did not exist | Linked ahead of the page, on every page, for the whole build |
| ✅ Nobody could change their own email or password | Never built; the admin page even claimed they could |
| ✅ Pagination showed nothing for a valid filtered page | PostgREST errors on an out-of-range page instead of returning empty |
| ✅ Chart labels overlapped illegibly at 390px | Fixed row height could not hold a wrapped label |
| ✅ `/contribute` was a dead click for 1287ms | No loading state on a route in the main menu |

---

## Open at handover

| | Item |
| --- | --- |
| ⚠️ | **Segment prefetch disabled.** Worked around, not fixed. The real fix needs a Next.js migration that currently fails the build. Zero user-facing impact; zero failing requests |
| ⚠️ | **Disagreements filter is a heuristic.** Accepted — the exact fix would break a published privacy promise |
| ⚠️ | **`lenis-smooth` class absent.** Traced to a rule that only affects iframes, of which this app has none. Closed as not a defect |
| 🔑 | **Rotate both demo passwords** before real students use the system |
| 👥 | **No genuine traffic yet.** The moderation queue and give-back loop have not been exercised by real use |

---

## The one thing worth protecting

The product's value is that it is **honest**. It publishes both accuracy
figures including the weaker one, refuses to invent statistics for fields with
too few students, and says *"students like you chose this"* rather than
*"you should study this."*

That is what makes it defensible to a school, a parent, or a regulator. It is
worth resisting pressure to soften.
