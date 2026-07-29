'use client';

// The "delete everything" control — the other half of the signup-page
// promise (lib/i18n/en.js auth.notice.body). Deliberately NOT a single
// button a thumb can hit by accident:
//
//   1. a quiet trigger — hairline border, tinted danger text, no filled
//      red block ("a quiet danger treatment, not a red slab" — the
//      design brief, verbatim);
//   2. opens a dialog that explains exactly what is being removed;
//   3. the dialog's own confirm button stays disabled until the student
//      types DELETE, byte for byte (lib/account/delete.js — the same
//      rule the server enforces, so the client can never promise a
//      confirmation the API would reject).
//
// The covered page behind the dialog is not made `inert`: unlike the
// signup/login sliding-panel pattern (visual-design-system.md §5c), there
// is only ONE interactive surface visible at a time here — the dialog
// owns a real focus trap (mirrors components/layout/header-client.jsx's
// drawer) so Tab can never reach the page underneath while it's open.
//
// Hook-order rule: every hook below runs unconditionally on every render;
// nothing here returns early before the hook list completes.
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { isDeleteConfirmed } from '@/lib/account/delete';
import en from '@/lib/i18n/en';

const t = en.account.delete;

const ghostDangerClass = cn(
  'inline-flex min-h-11 items-center justify-center rounded-full border px-5',
  'text-sm font-medium transition-colors duration-200',
  // No `outline-none` anywhere in this file — Tailwind v4's outline-none
  // sets --tw-outline-style: none unconditionally and silently kills the
  // focus-visible ring (see the long note in components/arah/FlowButton.jsx).
  'focus-visible:outline-2 focus-visible:outline-offset-2'
);

export default function DeleteAccountSection({ className }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  const confirmed = isDeleteConfirmed(confirmText);

  // Dialog lifecycle: focus moves in, Tab is trapped, Esc closes, body
  // scroll locks — the exact recipe header-client.jsx's mobile drawer
  // uses, scoped to this dialog's own focusable set.
  useEffect(() => {
    if (!open) return undefined;

    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function focusables() {
      return dialogRef.current
        ? Array.from(
            dialogRef.current.querySelectorAll('input:not([disabled]), button:not([disabled])')
          )
        : [];
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        closeDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (!nodes.includes(active)) {
        event.preventDefault();
        first.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openDialog() {
    setConfirmText('');
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    if (submitting) return;
    setOpen(false);
    triggerRef.current?.focus();
  }

  async function handleConfirm() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error('delete_failed');
      }
      // Hard navigation, not router.push: the session cookie was cleared
      // server-side, and a full reload is the simplest guarantee that
      // every cached Server Component — the signed-in header chiefly —
      // picks that up, rather than depending on refresh-timing.
      window.location.href = '/';
    } catch {
      setError(t.errors.generic);
      setSubmitting(false);
    }
  }

  return (
    <section className={cn('border-t border-hairline pt-10', className)}>
      <h2 className="font-display text-[21px] md:text-[24px]">{t.zoneTitle}</h2>
      <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-muted-foreground">
        {t.zoneBody}
      </p>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        className={cn(
          ghostDangerClass,
          'mt-6 border-danger/30 text-danger/90 hover:border-danger/60 hover:bg-danger/5 active:bg-danger/10',
          'focus-visible:outline-danger'
        )}
      >
        {t.trigger}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/85 px-6 py-10 backdrop-blur-sm animate-in fade-in duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            aria-describedby="delete-account-body"
            className="w-full max-w-[440px] rounded-2xl border border-hairline bg-surface p-6 animate-in fade-in zoom-in-95 duration-200 md:p-8"
          >
            <h3 id="delete-account-title" className="font-display text-[24px]">
              {t.dialogTitle}
            </h3>
            <p
              id="delete-account-body"
              className="mt-3 text-[14px] leading-[1.6] text-muted-foreground"
            >
              {t.dialogBody}
            </p>

            <label
              htmlFor="delete-confirm"
              className="mt-6 block text-[13px] font-medium text-text/90"
            >
              {t.confirmLabel}
            </label>
            <input
              ref={inputRef}
              id="delete-confirm"
              type="text"
              autoComplete="off"
              spellCheck="false"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={t.confirmPlaceholder}
              disabled={submitting}
              aria-invalid={confirmText.length > 0 && !confirmed ? true : undefined}
              className={cn(
                'mt-2 h-12 w-full rounded-lg border bg-ink px-4 text-[15px] text-text',
                'transition-[border-color] duration-200 hover:border-text/25',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />

            {error ? (
              <p role="alert" className="mt-4 text-[13px] leading-[1.5] text-danger">
                {error}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className={cn(
                  ghostDangerClass,
                  'border-hairline text-text/90 hover:border-violet-lt/50 hover:bg-surface-2 active:bg-surface-2',
                  'focus-visible:outline-violet-lt',
                  'disabled:pointer-events-none disabled:opacity-50'
                )}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!confirmed || submitting}
                aria-busy={submitting || undefined}
                className={cn(
                  ghostDangerClass,
                  'border-danger/50 bg-danger/10 font-semibold text-danger',
                  'hover:border-danger hover:bg-danger/20 active:bg-danger/25',
                  'focus-visible:outline-danger',
                  'disabled:pointer-events-none disabled:opacity-40'
                )}
              >
                {submitting ? t.deleting : t.confirmCta}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
