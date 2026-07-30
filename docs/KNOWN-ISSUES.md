# ARAH — known issues at delivery

## 1. RSC prefetch requests 404 in production (low severity, cosmetic)

**Symptom.** In a real browser, Next's link-prefetch requests return 404:
```
404  /?_rsc=TLJ23gVnbrIc7BPU
404  /explore/business-management?_rsc=TLJ23gVnbrIc7BPU
404  /login?next=%2Fquestions
```

**Impact.** Navigation is unaffected — verified by clicking a real field-card link:
landed on `/explore/architecture-built-environment`, correct `<h1>`, back button works.
The cost is (a) no prefetch speed benefit, so navigation is slightly slower on a slow
connection, and (b) console errors, which look alarming to anyone opening devtools.

**Not reproducible outside the browser.** `curl` returns 200 for the identical URLs,
including with `RSC: 1` and `Next-Router-Prefetch: 1` headers set. So it is triggered by
something only a browser sends — most likely `sec-fetch-*` headers interacting with the
Vercel Services catch-all rewrite in `vercel.json`:

```json
{ "source": "/(.*)", "destination": { "service": "web" } }
```

**Suggested next step.** Test whether removing the catch-all (letting the web service be
the default) resolves it, or raise with Vercel support — Services is a recent product and
this smells like a routing edge case rather than an application bug.

**Why it is not blocking.** No user-facing breakage. Worth fixing before heavy traffic,
not before demoing.

---

## 2. `lenis-smooth` class absent (cosmetic, no impact)

Lenis adds `lenis` to `<html>` but not `lenis-smooth`. Scrolling reaches 100% of the page
after the stylesheet fix, so this appears to be a version/naming difference rather than a
fault. Noted so a future reader does not chase it.

---

## 3. Disagreements filter is a heuristic

`/admin/responses` surfaces students whose later contribution differed from the model's
top pick. There is no foreign key linking a contribution to its originating submission,
so the match is a fingerprint heuristic. Flagged in the code. If this signal becomes
important for model improvement, add a proper `quiz_response_id` column to
`alumni_profiles` for user-contributed rows.

---

## Closed since first draft

**Contributions could never reach the model.** `train.py` reads a static CSV and nothing
exported approved `alumni_profiles` rows back to it, so an admin could approve
contributions indefinitely with no effect on predictions. `npm run export:training` now
closes that gap; the remaining four steps are manual and documented in
`docs/RETRAINING.md`, deliberately so.

**Authenticated journey unverified by hand.** Now driven end to end against production:
login → ten questions → `/results/<id>` (top match Business & Management at 66%) →
`/account` lists the run. No page errors. Role separation checked at the same time — the
demo student account is redirected away from all five admin routes while the admin
account reaches all five.

**Header nav had no current-page state.** Added, with `aria-current="page"` in both the
desktop row and the mobile drawer.

**`/explore` cards ended a row at three different heights.** `StaggerReveal` wraps each
child in the div that is the real grid item, so the card `Link` inside was sizing to its
own content and `mt-auto` had nothing to push against. Fixed with `h-full`.

**Heading utilities were silently ignored.** `h1, h2, h3, .font-display` sat outside
`@layer base`, and unlayered CSS outranks every layered rule regardless of specificity —
so `tracking-*`, `leading-*` and `font-semibold` on any heading were discarded without
error. Three micro-labels on the field pages rendered as unspaced serif. Moved into
`@layer base`.
