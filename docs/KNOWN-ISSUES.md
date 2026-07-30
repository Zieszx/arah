# ARAH — known issues at delivery

## 1. Segment prefetch is disabled (worked around, not fixed)

**What was happening.** Next's link prefetch returned 404 for every public
route. Diagnosed by replaying the browser's exact request headers one at a
time:

| headers | status | matched |
| --- | --- | --- |
| plain | 200 | `/explore` |
| `rsc: 1` | 200 | `/explore.rsc` |
| `rsc` + `next-router-prefetch` | 200 | `/explore.rsc` |
| **+ `next-router-segment-prefetch: /_tree`** | **404** | `/_not-found` |
| `segment-prefetch` alone | 200 | `/explore.rsc` |

So the failure needs `next-router-prefetch` AND `next-router-segment-prefetch`
together. Every route in this app is dynamic, and for a dynamic route Next's
default prefetch asks for a partial route — that segment request. The
deployment has no segment outputs to serve, so it fell through to
`/_not-found`.

**Two hypotheses tested and rejected.**

The `vercel.json` catch-all rewrite was the documented suspect. Removing it on
a preview deploy 404s the *entire site* — it is required for Vercel Services to
reach the web service at all.

`prefetch={true}` (full route instead of partial) does not help: the client
still sends `next-router-segment-prefetch: /_tree`. Measured, not assumed.

**The real fix, and why it is not applied.** `nextConfig.cacheComponents`
generates the segment outputs. Enabling it fails the build immediately —
`Route segment config "dynamicParams" is not compatible with
nextConfig.cacheComponents` in `app/explore/[field]/page.jsx` — and that is
only the first error. cacheComponents makes data fetching dynamic by default,
enables PPR, and requires `use cache` adoption throughout. It is a genuine
migration needing full re-verification, not a flag.

**What was done instead.** `prefetch={false}` on the site chrome and the field
cards. This costs nothing that was working: those prefetches had a 100%
failure rate, so they delivered no acceleration at all — only console errors.
Verified on a preview deploy: zero RSC requests on `/` and `/explore`, and
navigation still works (header → explore → a field page → privacy, all
correct, no failures).

`loading.jsx` now covers the perceived-speed gap prefetching would have.

**Revert this** when segment prefetch works — the `prefetch={false}` props
carry a comment pointing here.

---

## 2. `lenis-smooth` class absent — CLOSED, not a defect

Lenis adds `lenis` to `<html>` but not `lenis-smooth`. Chased to the end rather
than left as a shrug: `node_modules/lenis/dist/lenis.css` uses that class in
exactly one rule,

```css
.lenis.lenis-smooth iframe { pointer-events: none; }
```

and this application renders **no iframes at all** (`grep -rn "<iframe" app
components` returns nothing). The class is therefore inert here — there is no
behaviour it could have changed. Scrolling reaches 100% of every page.

Closed. Re-open only if an iframe is ever added.

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
