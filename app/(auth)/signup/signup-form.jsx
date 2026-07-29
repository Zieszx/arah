'use client';

// Signup form. Same useActionState pattern as login, plus two concerns:
//
// 1. The data notice (components/arah/DataNotice.jsx) renders INSIDE the
//    form, after the fields and before the submit button — a product
//    requirement: the reader must pass it on the way to the button, not
//    find it behind a link.
// 2. There is no email-confirmation interstitial: the action auto-confirms
//    the account server-side and redirects straight into the quiz. The
//    only non-redirect success path is `formNotice` — the account was
//    created but the server couldn't finish signing them in, so we say
//    exactly that and point at the login page.
import { useActionState } from 'react';
import { signup } from '../actions';
import { TextField, SubmitButton, SwitchLink } from '../form-controls';
import DataNotice from '@/components/arah/DataNotice.jsx';
import en from '@/lib/i18n/en';

const initialState = { fieldErrors: {}, values: { email: '' } };

export default function SignupForm({ next, className }) {
  const [state, formAction] = useActionState(signup, initialState);
  const t = en.auth.signup;
  const f = en.auth.fields;
  const errors = state?.fieldErrors ?? {};
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login';

  return (
    <form
      action={formAction}
      noValidate
      className={className ?? 'flex w-full max-w-[420px] flex-col gap-6'}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        id="email"
        name="email"
        type="email"
        label={f.email}
        autoComplete="email"
        required
        defaultValue={state?.values?.email ?? ''}
        error={errors.email}
      />
      <TextField
        id="password"
        name="password"
        type="password"
        label={f.password}
        autoComplete="new-password"
        required
        minLength={8}
        hint={f.passwordHint}
        error={errors.password}
      />
      <TextField
        id="confirm"
        name="confirm"
        type="password"
        label={f.confirmPassword}
        autoComplete="new-password"
        required
        error={errors.confirm}
      />
      <DataNotice />
      {errors.form ? (
        <p role="alert" className="text-[13px] leading-[1.5] text-danger">
          {errors.form}
        </p>
      ) : null}
      {state?.formNotice ? (
        <p role="status" className="text-[13px] leading-[1.6] text-text/90">
          {state.formNotice}{' '}
          <SwitchLink href={loginHref}>{t.switchCta}</SwitchLink>
        </p>
      ) : null}
      <SubmitButton pendingLabel={t.pending}>{t.submit}</SubmitButton>
    </form>
  );
}
