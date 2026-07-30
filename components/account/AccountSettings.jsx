'use client';

// Account settings: display name, email, password. Three separate forms, not
// one — each has a different authority requirement (changing a password needs
// the current one; renaming yourself does not), and a single combined form
// would have to demand the strictest of them for the mildest change.
//
// Every hook runs unconditionally, before any conditional rendering — the
// project's hook-order rule. Each form is its own component so useActionState
// is called once per form rather than conditionally.
import { useActionState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const t = en.account.settings;

const inputClass = cn(
  'h-12 w-full rounded-lg border border-hairline bg-surface px-4 text-[15px] text-text',
  'transition-[border-color] duration-200 hover:border-text/25',
  // No `outline-none` anywhere — Tailwind v4 sets --tw-outline-style: none
  // unconditionally and would silently kill the focus ring.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
);

const buttonClass = cn(
  'inline-flex min-h-11 w-fit items-center rounded-full border border-violet bg-violet px-6',
  'text-sm font-medium text-white transition-colors duration-200 hover:bg-violet-ink',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
  'disabled:cursor-not-allowed disabled:opacity-60'
);

function Field({ id, label, error, hint, children }) {
  return (
    <div className="flex max-w-sm flex-col gap-2">
      <label htmlFor={id} className="w-fit text-[13px] font-medium text-text/90">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-[13px] text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A password input with the same reveal toggle the auth forms use. */
function PasswordField({ id, name, label, error, hint, autoComplete }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={revealed ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass, 'pr-12', error && 'border-danger/70')}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-pressed={revealed}
          aria-controls={id}
          aria-label={revealed ? en.auth.passwordHide : en.auth.passwordShow}
          className={cn(
            'absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors duration-200 hover:text-text',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
          )}
        >
          {revealed ? (
            <EyeOff aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />
          ) : (
            <Eye aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />
          )}
        </button>
      </div>
    </Field>
  );
}

function Panel({ title, body, children }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-6 md:p-8">
      <h3 className="font-display text-[22px] text-text md:text-[26px]">{title}</h3>
      <p className="mt-2 max-w-[58ch] text-[14px] leading-[1.6] text-muted-foreground">
        {body}
      </p>
      {children}
    </section>
  );
}

function Result({ state, savedKey }) {
  if (state?.saved === savedKey) {
    return (
      <span aria-live="polite" className="text-sm text-teal">
        {t.saved}
      </span>
    );
  }
  if (state?.fieldErrors?.form) {
    return (
      <span aria-live="polite" className="text-sm text-danger">
        {state.fieldErrors.form}
      </span>
    );
  }
  return null;
}

function DisplayNameForm({ action, displayName }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <Panel title={t.nameTitle} body={t.nameBody}>
      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <Field
          id="account-display-name"
          label={t.nameLabel}
          error={state?.fieldErrors?.displayName}
        >
          <input
            id="account-display-name"
            name="displayName"
            type="text"
            maxLength={80}
            defaultValue={displayName ?? ''}
            placeholder={t.namePlaceholder}
            autoComplete="nickname"
            className={inputClass}
          />
        </Field>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? t.saving : t.save}
          </button>
          <Result state={state} savedKey="displayName" />
        </div>
      </form>
    </Panel>
  );
}

function EmailForm({ action, email }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <Panel title={t.emailTitle} body={t.emailBody}>
      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <Field id="account-email" label={t.emailLabel} error={state?.fieldErrors?.email}>
          <input
            id="account-email"
            name="email"
            type="email"
            defaultValue={email ?? ''}
            autoComplete="email"
            aria-invalid={state?.fieldErrors?.email ? true : undefined}
            className={cn(inputClass, state?.fieldErrors?.email && 'border-danger/70')}
          />
        </Field>
        <PasswordField
          id="account-email-current"
          name="currentPassword"
          label={t.currentPasswordLabel}
          hint={t.currentPasswordHint}
          autoComplete="current-password"
          error={state?.fieldErrors?.currentPassword}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? t.saving : t.saveEmail}
          </button>
          <Result state={state} savedKey="email" />
        </div>
      </form>
    </Panel>
  );
}

function PasswordForm({ action }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <Panel title={t.passwordTitle} body={t.passwordBody}>
      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <PasswordField
          id="account-current-password"
          name="currentPassword"
          label={t.currentPasswordLabel}
          autoComplete="current-password"
          error={state?.fieldErrors?.currentPassword}
        />
        <PasswordField
          id="account-new-password"
          name="password"
          label={t.newPasswordLabel}
          hint={t.newPasswordHint}
          autoComplete="new-password"
          error={state?.fieldErrors?.password}
        />
        <PasswordField
          id="account-confirm-password"
          name="confirm"
          label={t.confirmPasswordLabel}
          autoComplete="new-password"
          error={state?.fieldErrors?.confirm}
        />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? t.saving : t.savePassword}
          </button>
          <Result state={state} savedKey="password" />
        </div>
      </form>
    </Panel>
  );
}

export default function AccountSettings({
  email,
  displayName,
  updateDisplayNameAction,
  updateEmailAction,
  updatePasswordAction,
}) {
  return (
    <div className="flex flex-col gap-5">
      <DisplayNameForm action={updateDisplayNameAction} displayName={displayName} />
      <EmailForm action={updateEmailAction} email={email} />
      <PasswordForm action={updatePasswordAction} />
    </div>
  );
}
