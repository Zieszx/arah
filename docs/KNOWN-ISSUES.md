# ARAH — known issues at delivery

## 1. RSC prefetch requests 404 in production (low severity, cosmetic)

**Symptom.** In a real browser, Next's link-prefetch requests return 404:
```
404  /?_rsc=TLJ23gVnbrIc7BPU
404  /explore/business-management?_rsc=TLJ23gVnbrIc7BPU
404  /login?next=%2Fquestions
```

**Still present at delivery**, re-checked 30 July 2026: every `?_rsc=` prefetch on `/`,
`/explore` and the field pages returns 404.

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

Lenis adds `lenis` to `<html>` but not `lenis-smooth` — confirmed again at delivery, the
class list ends `... font-sans lenis`. Scrolling reaches 100% of the page after the
stylesheet fix, so this is a version/naming difference rather than a fault. Noted so a
future reader does not chase it.

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
demo student account is redirected away from all seven admin routes while the admin
account reaches all seven.

**The footer linked to `/privacy`, which did not exist.** On every page of the site, for
the whole build, behind a comment saying the 404 was "expected and fine" during
development. It was not fine at delivery — on a product about honest handling of
students' data, that is the worst possible broken link. `app/privacy/page.jsx` now exists
and states what is actually stored, who can see it, and how to delete it. Found by
watching which URLs the browser prefetched, not by any test — so
`tests/js/nav-links-resolve.test.js` now fails if any chrome link points at a route that
does not exist.

**The results page claimed a cohort of 16.** The headline sentence read "20–49 of the 16
students most like you studied this" — arithmetic nonsense, on the most important sentence
in the product. It summed `alumni_count` across the ranked entries, which was correct
until the 0009 hardening left an exact count only on SUPPRESSED fields; what remained to
sum was 9 + 7. That also published the sum of the two withheld counts. The cohort now
comes from the model that produced the prediction, new rows stamp it at submit time, and
a caller with no reliable figure renders nothing rather than a wrong one.

**Nobody could change their own email or password.** The account page only displayed the
email. `/account` now has display-name, email and password forms; email and password both
require the current password, re-checked server-side. There is deliberately no
reset-by-email link, because the system sends no mail at all.

**Out-of-range pagination showed nothing.** `?q=engineering&page=99` reported no results
when 23 rows matched: PostgREST answers an out-of-range range with error PGRST103 and a
null count rather than an empty page, so the clamp had no total to work with. All three
paged screens shared the hole; `lib/admin/pagedQuery.js` now owns it.

**Admin chrome duplicated on client navigation.** Two headers and three wordmarks after
navigating from a student page into `/admin`, because a root layout does not re-render on
client-side navigation. Moved to a client-side gate.

**Response-chart labels overlapped at 390px.** A flat row height could not hold a
four-line option label in a narrow axis column. Row height now follows the wrapping.

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
