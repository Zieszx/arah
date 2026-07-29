// POST /api/contribute — the give-back loop (Plan 4, Task 4). A signed-in
// alumnus re-answers the same ten predictive questions the original 2025
// survey asked, plus what they actually studied, why, how satisfied they
// ended up, and free-text advice. The row is added to alumni_profiles for
// a human to review — it never influences field_stats or a live
// prediction on its own (see supabase/migrations/0009_field_stats_hardening.sql:
// even once approved, published aggregates only move once 3 new verified
// rows have landed for that field).
//
// Trust boundary, the whole point of this route: verified is ALWAYS false
// and source is ALWAYS 'user_contributed', decided here, server-side, and
// never read from the request body at all — see
// lib/contribute/submission.js#mapContributionToRow's doc comment. A
// crafted request body containing "verified": true has no effect, because
// nothing in the code path from request -> row construction ever looks at
// that key.
//
// alumni_profiles has no select policy and (0004_tighten_alumni_grants.sql)
// no table grants at all for anon/authenticated — not even for a signed-in
// student inserting their own row. The insert therefore goes through the
// service-role admin client (lib/supabase/admin.js), same as the two other
// sanctioned uses of that client. Authentication is still checked first,
// against the ordinary RLS-bound request client, exactly like
// app/api/quiz/route.js and app/api/account/delete/route.js — the admin
// client bypasses RLS, not the auth check.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  cleanContribution,
  mapContributionToRow,
  validateContribution,
} from '@/lib/contribute/submission';
import en from '@/lib/i18n/en';

export async function POST(request) {
  try {
    // 1. Authenticate. proxy.js does not guard /contribute (the page is
    // browsable signed out — app/contribute/page.jsx shows a sign-in
    // prompt instead of the form in that case), so this route is its own
    // gate, exactly like /api/quiz.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json(
        { error: 'auth_required', message: en.api.contributeAuthRequired },
        { status: 401 },
      );
    }

    // 2. Validate server-side — the trust boundary. The client's own
    // validateContribution() call is a convenience for instant feedback,
    // never the authority.
    let body = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }
    const rawAnswers =
      body && typeof body === 'object' && !Array.isArray(body) ? body.answers : null;
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      return Response.json(
        { error: 'invalid_request', message: en.api.contributeInvalidRequest },
        { status: 422 },
      );
    }
    const answers = cleanContribution(rawAnswers);
    const { ok, errors } = validateContribution(answers);
    if (!ok) {
      return Response.json(
        {
          error: 'invalid_answers',
          message: en.api.contributeInvalidAnswers,
          fields: Object.keys(errors).sort(),
        },
        { status: 422 },
      );
    }

    // 3. Insert. verified: false and source: 'user_contributed' are fixed
    // inside mapContributionToRow — nothing above this line can override
    // them, and nothing below reads answers.verified or answers.source.
    const row = mapContributionToRow(answers);
    const admin = createAdminClient();
    const { error: insertError } = await admin.from('alumni_profiles').insert(row);
    if (insertError) {
      console.error('[api/contribute] alumni_profiles insert failed:', insertError.code ?? insertError.message);
      return Response.json(
        { error: 'server_error', message: en.api.serverError },
        { status: 500 },
      );
    }

    // 4. Done. No id is returned — there is nothing for the student to
    // navigate to (unlike the quiz, a contribution has no /results/<id>
    // page of its own) — just the thank-you state.
    return Response.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[api/contribute]', err);
    return Response.json(
      { error: 'server_error', message: en.api.serverError },
      { status: 500 },
    );
  }
}
