'use client';

// Login form — a Client Component so useActionState can carry field-level
// errors back from the Server Action without ever leaving the page (see
// node_modules/next/dist/docs/01-app/02-guides/forms.md, "Validation
// errors"). On success the action redirects server-side, honouring ?next=.
import { useActionState } from 'react';
import { login } from '../actions';
import { TextField, SubmitButton } from '../form-controls';
import en from '@/lib/i18n/en';

const initialState = { fieldErrors: {}, values: { email: '' } };

export default function LoginForm({ next, className }) {
  const [state, formAction] = useActionState(login, initialState);
  const t = en.auth.login;
  const f = en.auth.fields;
  const errors = state?.fieldErrors ?? {};

  return (
    <form
      id="login-form"
      name="login"
      action={formAction}
      noValidate
      className={className ?? 'flex w-full max-w-[420px] flex-col gap-6'}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <TextField
        id="login-email"
        name="email"
        type="email"
        label={f.email}
        autoComplete="email"
        required
        defaultValue={state?.values?.email ?? ''}
        error={errors.email}
      />
      <TextField
        id="login-password"
        name="password"
        type="password"
        label={f.password}
        autoComplete="current-password"
        required
        error={errors.password}
      />
      {errors.form ? (
        <p role="alert" className="text-[13px] leading-[1.5] text-danger">
          {errors.form}
        </p>
      ) : null}
      <SubmitButton pendingLabel={t.pending}>{t.submit}</SubmitButton>
    </form>
  );
}
