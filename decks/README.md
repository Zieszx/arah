# Presentation decks

`ARAH-System-Overview.pptx` is generated from `system-overview.js`, not
hand-edited. It is here so the deck can be regenerated after handover rather
than becoming a binary nobody can update — and so its figures can be checked
against the code that produced them.

Twenty slides, in the order a report is read: introduction, CRISP-DM
framework and data overview, tools and techniques, architecture, three
descriptive-analysis slides, four predictive-analysis slides, privacy, admin,
findings and future work. The nav strip across the top of every slide names
those sections and bolds the current one.

Two slides were removed when the client dropped the features behind them: the
Accuracy slide (both top-3 figures are still measured, but no longer published
anywhere in the product) and the Give-back loop slide (/contribute and its
moderation queue are gone).

The Accuracy slide's figures survive on the Findings slide, stated as measured
rather than published. That distinction is load-bearing — do not quietly
promote them back to a claim about what a student can see.

## Regenerating

```bash
npm run deck
```

That builds the .pptx into the repo root and immediately runs the geometry
check. `pptxgenjs` is a devDependency, so `npm install` is all the setup there
is — the generator used to depend on a global install, which meant "regenerate
after handover" was not actually true for anyone but the original machine.

`qa.py` reads the real shape boxes back out of the generated file and flags
content escaping the slide, text that will not fit its box, and overlapping
panels. It is not decoration: it caught a title that wrapped to two lines and
ran into the cards below it, which no amount of re-reading the source would
have shown.

`npm run deck` does **not** regenerate the two inputs below. Run them yourself
when the corpus or the live site changes:

```bash
python decks/describe_corpus.py   # -> decks/descriptive-stats.json
python decks/crop_shots.py        # -> decks/assets/*.crop.png
```

## The two generated inputs

`describe_corpus.py` reads `ml/data/survey.csv` — the file `ml/train.py` reads,
not the convenience copy in `datasets/` — and writes every number on the three
descriptive-analysis slides into `descriptive-stats.json`. Nothing on those
slides is typed by hand, including the sentences: the card text interpolates
from the JSON, so a change in the corpus changes the prose as well as the bars.

`decks/assets/` holds the screenshots. The raw captures are 1440x900 browser
shots of the live site; `crop_shots.py` trims each to the part worth showing at
slide size, using the boxes recorded at the top of that file. The deck embeds
the `.crop.png` files. To refresh them, re-capture at 1440x900 to the same
filenames and re-run the crop script.

Screenshot captions name the URL they came from. Keep that habit — a reader
who cannot open the same page and see the same thing has to take the slide on
trust, which is the opposite of what this deck is for.

## The figures are load-bearing

Every number on the findings, quality and descriptive slides describes the
shipped system. When any of these change, the deck changes with them:

| Slide | Figure | Source of truth |
| --- | --- | --- |
| Findings | 71.5% / 63.7% | `python ml/measure_paths.py` |
| Quality | JavaScript tests passing | `npm test` |
| Quality | Python tests passing | `python -m pytest` |
| Quality | commits | `git rev-list --count HEAD` |
| Quality, Architecture | migration count | `ls supabase/migrations/*.sql` |
| Descriptive analysis ×3 | every figure and most of the prose | `python decks/describe_corpus.py` |
| Throughout | 207 alumni | rows in `ml/data/survey.csv` |

Two of those need care:

**The JavaScript test count is not one number.** `npm test` defines 372 tests
and runs 359; the other 13 drive the live production site and are skipped —
visibly, not silently — when no production credentials are present. The deck
says 359 passing and explains the 13. An earlier version claimed a flat "398",
which matched neither figure. These counts dropped when the contribute, sand
and accuracy features were removed along with their suites — re-run `npm test`
rather than assuming.

**The commit count cannot be re-derived from the handover folder**, which is
not a git checkout. Run `git rev-list --count HEAD` in the working repo
instead — the delivery copy carries the number, not the means to check it.

A deck quoting a stale accuracy number in a client meeting is worse than no
deck. If you are unsure whether a figure is current, re-run the command in the
right-hand column rather than trusting the slide.

## Editing

Edit the JavaScript, not the PowerPoint. A change made directly in PowerPoint
is lost the next time anyone regenerates.

Slide content lives in the numbered blocks at the bottom of
`system-overview.js`; the palette, type and the `slide()` / `card()` /
`panel()` / `screenshot()` helpers are at the top. The palette is taken from
the product itself — violet leads, cyan supports, near-white paper, serif
display over sans body — so the deck and the site read as the same thing.

Two things that are easy to get wrong and that `qa.py` will not catch:

- Use `line: NO_LINE`, never `line: { width: 0 }`. PowerPoint draws a dark
  hairline for a zero-width outline, so every flat fill in the deck grew a
  border nobody intended.
- Pass `headH` to `panel()` when a card heading wraps to two lines. The body
  starts below the heading box, so leaving it at the one-line default puts the
  second line of heading through the first line of body.

`ARAH-Pitch.pptx` predates this and has no generator; it is a hand-built deck.
