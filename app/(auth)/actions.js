'use server';

// Server Actions for signup and login.
//
// Both are invoked through React's <form action> + useActionState, so each
// takes (prevState, formData) and returns a plain state object on failure —
// { fieldErrors: { email?, password?, confirm?, form? }, values: { email } }
// — which the client form renders inline next to the field it belongs to.
// Nothing here ever throws a user-visible error page, and no raw Supabase
// error string ever reaches the UI: mapAuthError() translates known error
// codes to the humane copy in lib/i18n/en.js and everything unknown
// collapses to the generic message.
//
// On success each action calls redirect(), which throws NEXT_REDIRECT by
// design and must therefore sit outside any try/catch (see
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md,
// "Behavior"). The session cookie is written by the Task 1 server client
// (lib/supabase/server.js): inside a Server Action, cookieStore.set() is
// permitted, so signInWithPassword/signUp persist the session before the
// redirect response leaves the server.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import en from '@/lib/i18n/en';

const E = en.auth.errors;

// Good-enough shape check; the mail server is the real validator. Supabase
// also validates server-side (error code "validation_failed").
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Where a fresh session lands when no ?next= was carried in.
const DEFAULT_NEXT = '/quiz';

// The ?next= value is attacker-controllable (it's a URL parameter), so it
// must stay a same-origin path: absolute URLs, protocol-relative "//evil.com"
// and backslash tricks are all collapsed to the default. Prevents an open
// redirect from a link like /login?next=https://phish.example.
function safeNext(raw) {
  if (typeof raw !== 'string') return DEFAULT_NEXT;
  if (!raw.startsWith('/')) return DEFAULT_NEXT;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_NEXT;
  return raw;
}

// Translate a Supabase AuthError into field-level copy. Codes are from
// @supabase/auth-js (error.code); matching on codes, not message text,
// keeps this stable across Supabase message wording changes.
function mapAuthError(error) {
  switch (error?.code) {
    case 'invalid_credentials':
      return { password: E.invalidCredentials };
    case 'email_not_confirmed':
      return { email: E.emailNotConfirmed };
    case 'user_already_exists':
    case 'email_exists':
      return { email: E.emailTaken };
    case 'weak_password':
      return { password: E.weakPassword };
    case 'validation_failed':
    case 'email_address_invalid':
      return { email: E.emailInvalid };
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return { form: E.rateLimited };
    default:
      // Server-side only: log the code (never shown to the user) so an
      // unmapped case is diagnosable from logs instead of invisible.
      console.error('unmapped auth error code:', error?.code, error?.status);
      return { form: E.generic };
  }
}

export async function login(prevState, formData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));

  const fieldErrors = {};
  if (!email) fieldErrors.email = E.emailRequired;
  else if (!EMAIL_RE.test(email)) fieldErrors.email = E.emailInvalid;
  if (!password) fieldErrors.password = E.passwordRequired;
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { fieldErrors: mapAuthError(error), values: { email } };
  }

  // Safety net for accounts whose profiles row doesn't exist yet — e.g. a
  // signup that hit the created-but-couldn't-sign-in fallback (no session
  // at signup time, so the row couldn't be inserted then). No-op when the
  // row already exists.
  await ensureProfile(supabase, data.user.id);

  redirect(next);
}

export async function signup(prevState, formData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const next = safeNext(formData.get('next'));

  const fieldErrors = {};
  if (!email) fieldErrors.email = E.emailRequired;
  else if (!EMAIL_RE.test(email)) fieldErrors.email = E.emailInvalid;
  if (!password) fieldErrors.password = E.passwordRequired;
  else if (password.length < 8) fieldErrors.password = E.passwordTooShort;
  if (!confirm) fieldErrors.confirm = E.confirmRequired;
  else if (password && confirm !== password) fieldErrors.confirm = E.confirmMismatch;
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values: { email } };
  }

  // Product decision (2026-07-29): ARAH does not do email confirmation.
  // The address is only an identifier — nothing is ever sent to it — and
  // making a student wait on a mail that may never arrive is pure funnel
  // loss. The account is therefore created ALREADY CONFIRMED through the
  // service-role admin client (lib/supabase/admin.js — server-only, the
  // key never reaches the browser). This deliberately does not go through
  // anon signUp(): with the project's "confirm email" toggle on, signUp
  // queues a confirmation email before anything can be auto-confirmed,
  // which both sends a mail we don't want and trips Supabase's built-in
  // SMTP rate limit (~2/hour) — observed live during verification. The
  // admin path sends nothing, and behaves identically if the project
  // toggle is later switched off.
  let userId;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) {
      return { fieldErrors: mapAuthError(error), values: { email } };
    }
    userId = data.user.id;
  } catch (err) {
    // Admin client misconfigured or unreachable. Log server-side only.
    console.error('signup admin createUser failed:', err?.code ?? err?.message);
    return { fieldErrors: { form: E.generic }, values: { email } };
  }

  // Now establish the browser session with the normal RLS-bound server
  // client, which writes the auth cookies from this Server Action.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    // The account exists but the sign-in step failed. Never surface the
    // raw error — log it and tell the student plainly that their account
    // is ready and they should sign in.
    console.error('post-signup sign-in failed:', signInError.code);
    return { formNotice: en.auth.signup.createdSignInFallback, values: { email } };
  }

  await ensureProfile(supabase, userId);

  redirect(next);
}

// Sign out and land on the public home page. Invoked from the site
// header's <form action={...}> (both the desktop bar and the mobile
// drawer), so it inherits the same Server Action plumbing as login/signup:
// the auth cookies are cleared here on the server, and redirect() sits
// outside any try/catch because it throws NEXT_REDIRECT by design.
// signOut() failing (already-expired session, network blip) is not a
// user-facing problem — the redirect happens regardless, and the proxy
// treats a request without valid cookies as signed out anyway.
export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('signOut failed:', error.code);
  }
  redirect('/');
}

// Create the user's profiles row if it doesn't exist yet. Runs as the
// authenticated user, which is exactly what RLS + the column grants from
// supabase/migrations/0005_profiles_admin.sql allow: insert of (id) where
// auth.uid() = id. Uses upsert with ignoreDuplicates so a re-run (double
// submit, retry after a dropped connection) is a no-op rather than a 409.
// A failure here is logged but does not block the redirect: auth succeeded,
// and the row will be retried on the next login.
async function ensureProfile(supabase, userId) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) {
    console.error('profiles insert failed for authenticated user:', error.code);
  }
}
