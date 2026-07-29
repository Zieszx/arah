'use client';

// Signup form. Same useActionState pattern as login. Two extra concerns:
//
// 1. The data notice (components/arah/DataNotice.jsx) renders INSIDE the
//    form, after the fields and before the submit button — a product
//    requirement: the reader must pass it on the way to the button, not
//    find it behind a link.
// 2. If the Supabase project requires email confirmation, the action
//    returns { confirmEmail: true } instead of redirecting; the form is
//    then replaced by a check-your-inbox panel.
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
  const c = en.auth.confirmEmail;
  const errors = state?.fieldErrors ?? {};

  if (state?.confirmEmail) {
    const loginHref = next
      ? `/login?next=${encodeURIComponent(next)}`
      : '/login';
    return (
      <div role="status" className="flex max-w-[420px] flex-col gap-4">
        <p className="text-[15px] leading-[1.6] text-text/90">{c.body}</p>
        <p className="text-[13px] text-muted-foreground">
          <SwitchLink href={loginHref}>{c.cta}</SwitchLink>
        </p>
      </div>
    );
  }

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
      <SubmitButton pendingLabel={t.pending}>{t.submit}</SubmitButton>
    </form>
  );
}
