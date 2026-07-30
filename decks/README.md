# Presentation decks

`ARAH-System-Overview.pptx` is generated from `system-overview.js`, not
hand-edited. It is here so the deck can be regenerated after handover rather
than becoming a binary nobody can update — and so its figures can be checked
against the code that produced them.

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

## The figures are load-bearing

Every number on the accuracy and quality slides describes the shipped system.
When any of these change, the deck changes with them:

| Slide | Figure | Source of truth |
| --- | --- | --- |
| Accuracy | 71.5% / 63.7% / 49.3% | `python ml/measure_paths.py` |
| Quality | JavaScript test count | `npm test` |
| Quality | Python test count | `python -m pytest` |
| Quality | commits | `git rev-list --count HEAD` |
| Quality, Architecture | migration count | `ls supabase/migrations/*.sql` |
| Throughout | 207 alumni | sum of `class_counts` in `services/ml/feature_spec.json` |

A deck quoting a stale accuracy number in a client meeting is worse than no
deck. If you are unsure whether a figure is current, re-run the command in the
right-hand column rather than trusting the slide.

## Editing

Edit the JavaScript, not the PowerPoint. A change made directly in PowerPoint
is lost the next time anyone regenerates.

Slide content lives in the numbered blocks at the bottom of
`system-overview.js`; the palette, type and the `slide()` / `card()` helpers
are at the top. The palette is taken from the product itself — violet leads,
cyan supports, near-white paper, serif display over sans body — so the deck
and the site read as the same thing.

`ARAH-Pitch.pptx` predates this and has no generator; it is a hand-built deck.
