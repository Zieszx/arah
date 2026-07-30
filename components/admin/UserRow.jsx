'use client';

// One account in the /admin/users list: read-only facts, expanding into an
// edit form. Only display name and role are editable — see lib/admin/users.js
// for why a password is not, and cannot be, shown here.
//
// The row is a <details>, so it works closed-to-open before hydration and
// keeps its own open state without any JavaScript from us.
import { useActionState } from 'react';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const t = en.admin.users;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATE_FORMAT.format(d);
}

function Fact({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
}

export default function UserRow({ user, isSelf, adminCount, action }) {
  const [state, formAction, pending] = useActionState(action, {});

  // Demotion is refused server-side in both these cases; disabling the
  // control as well means the reason is visible before the click rather than
  // as an error afterwards.
  const wouldLockSelfOut = isSelf && user.isAdmin;
  const isLastAdmin = user.isAdmin && adminCount <= 1;
  const roleLocked = wouldLockSelfOut || isLastAdmin;

  return (
    <details className="group rounded-2xl border border-hairline bg-surface">
      <summary
        className={cn(
          'flex cursor-pointer list-none flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet'
        )}
      >
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-ink">
            {user.displayName || t.noName}
          </p>
          <p className="truncate font-mono text-[13px] text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.isAdmin ? (
            <span className="inline-flex items-center rounded-full border border-violet/30 bg-violet-soft/60 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-violet-ink">
              {t.roleAdmin}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.roleStudent}
            </span>
          )}
          {!user.confirmed ? (
            <span className="inline-flex items-center rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-amber">
              {t.unconfirmed}
            </span>
          ) : null}
          <span className="text-sm text-muted-foreground group-open:hidden">{t.expand}</span>
          <span className="hidden text-sm text-muted-foreground group-open:inline">
            {t.collapse}
          </span>
        </div>
      </summary>

      <div className="border-t border-hairline p-5">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Fact label={t.factJoined}>{formatDate(user.createdAt)}</Fact>
          <Fact label={t.factLastSeen}>{formatDate(user.lastSignInAt)}</Fact>
          <Fact label={t.factSubmissions}>
            <span className="font-mono tabular-nums">{user.submissionCount}</span>
          </Fact>
          <Fact label={t.factConfirmed}>{user.confirmed ? t.yes : t.no}</Fact>
        </dl>

        <form action={formAction} className="mt-6 flex flex-col gap-4 border-t border-hairline pt-5">
          <input type="hidden" name="id" value={user.id} />
          {/* An unchecked checkbox submits nothing, so the action cannot tell
              "unticked" from "the control was never rendered". This says
              which it was. */}
          <input type="hidden" name="roleEditable" value={roleLocked ? '0' : '1'} />

          <label className="flex max-w-sm flex-col gap-2">
            <span className="text-[13px] font-medium text-ink">{t.displayNameLabel}</span>
            <input
              name="displayName"
              type="text"
              defaultValue={user.displayName ?? ''}
              maxLength={80}
              placeholder={t.displayNamePlaceholder}
              className="h-11 w-full rounded-lg border border-hairline bg-surface px-3 text-[15px] text-ink placeholder:text-muted-foreground transition-colors duration-200 hover:border-ink/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <label className="flex w-fit items-center gap-2.5">
              <input
                name="isAdmin"
                type="checkbox"
                defaultChecked={user.isAdmin}
                disabled={roleLocked}
                className="size-4 accent-[var(--color-violet)] disabled:opacity-50"
              />
              <span
                className={cn(
                  'text-[15px]',
                  roleLocked ? 'text-muted-foreground' : 'text-ink'
                )}
              >
                {t.isAdminLabel}
              </span>
            </label>
            {wouldLockSelfOut ? (
              <p className="text-[13px] text-muted-foreground">{t.selfDemoteHint}</p>
            ) : isLastAdmin ? (
              <p className="text-[13px] text-muted-foreground">{t.lastAdminHint}</p>
            ) : null}
          </div>

          {/* The password notice is stated once, at the top of the page. It
              was here as well and read as the same paragraph twice on screen
              the moment a row was expanded. */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              className={cn(
                'inline-flex min-h-10 items-center rounded-full border border-violet bg-violet px-5 text-sm font-medium text-white',
                'transition-colors duration-200 hover:bg-violet-ink',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            >
              {pending ? t.saving : t.save}
            </button>
            {state?.saved ? (
              <span aria-live="polite" className="text-sm text-teal">
                {t.saved}
              </span>
            ) : null}
            {state?.error ? (
              <span aria-live="polite" className="text-sm text-danger">
                {state.error}
              </span>
            ) : null}
          </div>
        </form>
      </div>
    </details>
  );
}
