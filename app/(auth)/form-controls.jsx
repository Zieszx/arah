'use client';

// Shared form primitives for the auth screens.
//
// TextField: label always visible above the input (placeholder-only labels
// fail accessibility and confuse users mid-form), 1px hairline border on
// --surface, violet-lt focus ring, danger border + inline message on error.
//
// SubmitButton: the kit's FlowButton wired to React 19's useFormStatus —
// `pending` is read from the nearest ancestor <form> running a Server
// Action (react-dom hook; must live in a child component of the form, per
// node_modules/next/dist/docs/01-app/02-guides/forms.md "Pending states").
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import FlowButton from '@/components/arah/FlowButton.jsx';
import { cn } from '@/lib/utils';

export function TextField({ id, label, hint, error, className, ...inputProps }) {
  const describedBy =
    [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="w-fit text-[13px] font-medium text-text/90">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          // 48px tall — comfortably past the 44px touch-target floor.
          'h-12 w-full rounded-lg border bg-surface px-4 text-[15px] text-text',
          'transition-[border-color] duration-200',
          'hover:border-text/25',
          // Focus ring: focus-visible width only — deliberately no
          // `outline-none`, which would unconditionally set
          // --tw-outline-style: none and silently kill the ring (see the
          // long note in components/arah/FlowButton.jsx). Text inputs
          // match :focus-visible on any focus, mouse included.
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger/70'
        )}
        {...inputProps}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${id}-error`}
          aria-live="polite"
          className="text-[13px] leading-[1.5] text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, pendingLabel, className }) {
  const { pending } = useFormStatus();
  return (
    <FlowButton
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn('w-full active:brightness-95 sm:w-fit', className)}
    >
      {pending ? pendingLabel : children}
    </FlowButton>
  );
}

// The "switch to the other page" inline link. Negative margins keep the
// visual rhythm while the padding grows the hit area toward 44px.
export function SwitchLink({ href, children }) {
  return (
    <Link
      href={href}
      className={cn(
        '-my-3 inline-block px-1 py-3 text-violet-lt underline underline-offset-4',
        'transition-colors duration-200 hover:text-violet-pl',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
      )}
    >
      {children}
    </Link>
  );
}
