# ARAH Student Journey — Implementation Plan (3 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A student can create an account, answer ten questions, and receive ranked course recommendations produced by the trained model from 207 real alumni — with their data handled honestly and deletable on request.

**Architecture:** Supabase Auth via `@supabase/ssr` cookie sessions. The quiz renders its questions from `services/ml/feature_spec.json`, so the UI can never drift from what the model was trained on. Submission goes to a Next.js route handler that validates server-side, persists, calls the Python ML service, and stores the prediction. Results are read back from the stored row, so a shared link stays stable.

**Tech Stack:** Next.js 16.2.12 (App Router, JSX), React 19.2.4, Supabase Auth + Postgres, Tailwind v4, Motion, the existing ARAH component kit.

## Global Constraints

- **JSX, never TSX.** No `.ts`/`.tsx`, no `tsconfig.json`.
- **Next.js 16 / React 19 are newer than model training data.** Read `node_modules/next/dist/docs/01-app/` before writing App Router code — especially Server Actions, `cookies()`, and middleware, which have changed.
- **Tailwind v4** — tokens in `@theme` in `app/globals.css`. No `tailwind.config.js`.
- **Never hardcode a question, option or field name.** Everything comes from `services/ml/feature_spec.json` via `lib/features.js`. A hardcoded option that drifts from the spec produces silently wrong predictions.
- **Validate server-side.** `validateAnswers` in the browser is a convenience; `encode.validate_answers` in Python is the trust boundary. Never trust the client.
- **Contrast:** `--color-violet` `#7C3AED` on ink is **3.52:1** — large text, borders and fills only. Body text uses `--color-violet-lt` (7.4:1).
- **Reduced motion and touch** must be honoured on every new animated element, gated on `useMotionCapability()`. The CSS media block does not cover JS animation.
- **Hook-order rule:** `useMotionCapability()` returns `enabled:false` then flips after mount. Never early-return before all hooks run.
- Never commit secrets. `git ls-files | grep -Ei '\.env|\.vercel'` must return nothing.
- Repo root `E:\Barang Barang\.PersonalWork\Freelance\Nuha\arah\arah`, branch `main`.

## The design bar

Every screen in this plan is student-facing and must meet the standard set at `/demo`. It is not enough to be functional.

- **Compose from the existing kit** — `FlowButton`, `Kicker`, `MatchBar`, `ConfidenceBadge`, shadcn primitives. Do not invent a second button style. A design system that gets bypassed stops being one.
- **Editorial, not app-generic.** Instrument Serif for headlines at real size (48–64px on desktop), Inter for everything else, left-aligned, generous space. Section padding ~96px desktop / 56px mobile. Body copy ≤68 characters per line.
- **Violet leads, cyan supports, never equal weight.** One accent dominates each screen.
- **No grids, no box patterns, ever.** Rejected by the client by name.
- **Interactive, with restraint.** Every control has hover, focus-visible, active and disabled states. Transitions are 150–250ms and easing is consistent. Motion should feel deliberate, never bouncy — the tuned sand physics set the tone: slow, weighted, settling.
- **Responsive at 320 / 390 / 768 / 1280 / 1920**, verified by screenshot, not assumed. No horizontal scrollbar at any width.
- **A student on a cheap Android on a slow connection is the target user**, not a designer on a 27-inch display. If a flourish costs legibility or battery, drop it.

---

## Task 1: Supabase auth plumbing and the admin flag

**Files:** Create `lib/supabase/{client,server,middleware}.js`, `middleware.js`, `supabase/migrations/0005_profiles_admin.sql`

- [ ] **Step 1: Read the docs.** Supabase's Next.js App Router integration uses `@supabase/ssr` with cookie handling that differs between server components, route handlers and middleware. Read `node_modules/next/dist/docs/01-app/` on middleware and `cookies()` before writing. Install `@supabase/ssr`.

- [ ] **Step 2: Migration** — `supabase/migrations/0005_profiles_admin.sql`:

```sql
alter table profiles add column if not exists is_admin boolean not null default false;

-- Admin is granted explicitly, never by self-service.
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Admins may read every quiz response and prediction, for support.
drop policy if exists "admins read responses" on quiz_responses;
create policy "admins read responses" on quiz_responses for select using (is_admin());
drop policy if exists "admins read predictions" on predictions;
create policy "admins read predictions" on predictions for select using (is_admin());
```

Apply with `scripts/db-migrate.mjs`, run twice for idempotency. Then set the flag for the demo account only, via a service-role script — **never** expose a way for a user to set their own `is_admin`.

- [ ] **Step 3:** Three Supabase clients — browser, server, middleware — each with correct cookie handling. `middleware.js` refreshes the session and protects `/quiz`, `/results`, `/admin`.

- [ ] **Step 4: Verify** an anonymous request to `/quiz` redirects to `/login`, and that `is_admin()` returns false for a normal user. Commit.

---

## Task 2: Signup, login, and an honest data notice

**Files:** `app/(auth)/login/page.jsx`, `app/(auth)/signup/page.jsx`, `app/(auth)/actions.js`, `components/arah/DataNotice.jsx`

Email + password only (Google is deferred). Use Server Actions with `redirect()` on success and inline field errors on failure — never a bare error page.

**The data notice is a product requirement, not boilerplate.** On the signup form, before the button, state plainly:

> We store your answers and your results so you can come back to them. We do not sell them or share them with universities. You can delete everything from your account page at any time.

Keep it in `lib/i18n/en.js` like all copy. Do not bury it in a link — most users are 17 and will not click it.

Both pages use the existing kit: `Kicker`, `FlowButton`, Instrument Serif headline, ink ground.

**Verify:** signup creates `auth.users` + `profiles` rows; login redirects to `/quiz`; a wrong password shows an inline message; the notice is visible without scrolling at 390px. Commit.

---

## Task 3: The quiz

**Files:** `app/quiz/page.jsx`, `components/quiz/{QuestionCard,ProgressRing,OptionGrid}.jsx`, `lib/quiz/useQuizState.js`

**Ten questions, rendered from the spec** — `getGroups()` from `lib/features.js`. Never hardcode.

Order, grouped so it feels like a conversation rather than a form:
1–3 *about you* — school type, SPM results, stream
4–9 *what you like* — subjects enjoyed, subjects found hard, preferred tasks, traits, personality, public speaking
10 *where you're heading* — pre-U route, **with an explicit "Not sure yet" option**

**The pre-U question is special.** Alumni had all chosen a route; a student using ARAH often has not. "Not sure yet" is a first-class answer that triggers marginalisation server-side. Never require it, never default it, and never imply the student is doing something wrong by skipping it.

Requirements: one question per screen; a progress ring; back/forward with answers preserved; `max_select` enforced with a clear message when exceeded; answers mirrored to `localStorage` so a refresh loses nothing; full keyboard operation with each question a labelled `fieldset`; the current step announced to screen readers via a live region. Motion transitions gate on `useMotionCapability()`.

**Verify:** the rendered options match `feature_spec.json` exactly (assert programmatically, not by eye); refresh mid-quiz preserves answers; keyboard-only completion works. Commit.

---

## Task 4: Submission route

**Files:** `app/api/quiz/route.js`, `lib/supabase/queries.js`

`POST /api/quiz`:
1. Authenticate; 401 if not signed in.
2. Validate the payload against the spec server-side. 422 with offending field keys on failure — never trust the browser.
3. Insert `quiz_responses`.
4. Call the ML service. **On the server**, using an absolute URL derived from `VERCEL_URL` or a configured base, never a relative fetch.
5. Annotate each result with `alumni_count` from `field_stats` and a confidence tier (high ≥20, medium 10–19, low <10).
6. Insert `predictions` with `model_version` and `marginalised`.
7. Return `{ id }`; the client redirects to `/results/[id]`.

**Errors:** one retry on ML timeout, then a friendly message with the response already saved so the student retries without re-answering. Never surface an internal error to the client — Plan 1 fixed exactly that leak in the Python service; do not reintroduce it here.

**Verify:** unauthenticated → 401; malformed → 422 listing fields; a valid submission produces a prediction row whose ranked fields sum to ~1.0. Commit.

---

## Task 5: Results

**Files:** `app/results/[id]/page.jsx`, `components/results/{ResultList,AlumniContext,MarginalisedNotice}.jsx`

A server component reading the stored prediction — never recomputing, so a shared link is stable.

Shows: the top field large in Instrument Serif; `MatchBar` for the top five; `ConfidenceBadge` per field; and **explainability** — *"N of the 207 students most like you studied this."* Alumni context per field comes from `field_stats`: sample size, average satisfaction, common pre-U route, with the **suppressed** flag respected. When `suppressed` is true, show the sample size and say statistics are withheld because the sample is too small to report without risking identifying someone — do not show a blank or a zero.

When `marginalised` is true, render `MarginalisedNotice`: *"You haven't picked a pre-U route yet, so this is averaged across all five. Tell us your route to sharpen it."* with a one-click re-run.

Also link "not what you expected?" to `/explore` (Plan 4) — a student disagreeing with the model is a legitimate outcome, not an error.

**Verify:** a low-confidence field renders the honest sentence; a suppressed field shows no fabricated statistics; the page renders identically on reload (stored, not recomputed). Commit.

---

## Task 6: Account page and deletion

**Files:** `app/account/page.jsx`, `app/api/account/delete/route.js`

Lists the student's past quizzes with links to results, and a **delete everything** action: a confirm step, then removal of `quiz_responses`, `predictions` and `profiles`, then sign-out. Deletion must be genuine — verify the rows are gone, not merely hidden.

This is what makes the signup notice truthful. If deletion does not work, the notice is a lie.

**Verify:** after deletion the rows are absent when queried with the service role, and the user is signed out. Commit.

---

## Task 7: Global chrome — nav and footer

**Files:** `components/layout/{SiteHeader,SiteFooter}.jsx`; modify `app/layout.jsx`

**SiteHeader** — `ARAH` logotype in Instrument Serif (`letter-spacing: 0.20em`) linking home, nav to Quiz / Explore / Account, and a Log in / Log out action reflecting session state. On mobile it collapses to an animated hamburger-to-close toggle (the 21st.dev `menu-toggle-icon` pattern the client picked). Transparent over the particle field, gaining a subtle `--surface` backdrop blur once scrolled.

**SiteFooter** — sits at the bottom of every page. Contains:
- the ARAH mark and a one-line description
- links: Explore, Contribute, Account, Privacy
- *"Trained on 207 real SPM leavers"* with the current model version
- **an Admin button, bottom-right, discreet but present.** Signed out, it links to `/login?next=/admin`. Signed in as an admin it reads *"Admin"* and links to `/admin`. Signed in as a normal student it is **not rendered at all** — a student should never see a door they cannot open.

Style it as a quiet ghost-pill (1px `--hairline` border, transparent fill, `--muted` label, `--violet-lt` on hover) — deliberately lower-contrast than a `FlowButton`, because this is staff furniture, not a call to action. It must still meet 4.5:1 for its label text and have a visible focus ring.

**Verify:** the admin button is absent in the DOM (not merely hidden with CSS) for a signed-in non-admin — assert on the served HTML, since `display:none` would still leak its existence. Confirm header and footer render correctly at 320, 390, 768, 1280 and 1920. Commit.

---

## Task 8: End-to-end journey

**Files:** `tests/e2e/journey.spec.js`, Playwright config

One test covering signup → quiz (all ten, including "Not sure yet") → results, run at **390px and 1280px**. Assert the results page shows ranked fields, that the marginalised notice appears when pre-U is skipped, and that no console errors occur.

Add a second covering delete-my-data.

**Verify:** both pass locally against a dev server, and the suite is runnable in CI. Commit.

---

## Self-Review

**Spec coverage.** Auth → Tasks 1–2. Quiz from spec → Task 3. Server validation and marginalisation → Tasks 3–4. Confidence tiers and explainability → Task 5. Suppression respected → Task 5. Data policy honoured → Tasks 2 and 6. Admin RLS groundwork → Task 1 (the admin *UI* is Plan 5).

**Type consistency.** `getGroups()`/`validateAnswers()` from `lib/features.js` are used identically in Tasks 3 and 4. The `{ranked, model_version, marginalised}` contract from Plan 1's ML service is consumed unchanged in Task 4 and read back in Task 5. `field_stats` columns (`sample_size`, `avg_satisfaction`, `pct_dissatisfied`, `common_preu`, `suppressed`) match migration 0002.

**Risk.** Task 3 is the largest. If its reviewer finds the component doing too much, the cut line is extracting per-type option rendering into `components/quiz/inputs/`.
