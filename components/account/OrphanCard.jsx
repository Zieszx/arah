'use client';

// A quiz_responses row whose prediction never completed — the ML service
// was down mid-submission (proven live during Task 4 testing; POST
// /api/quiz deliberately persists the answers BEFORE calling the model,
// so this is an expected, recoverable state, not data loss). Shown
// honestly rather than as a broken or empty row, with a one-click retry.
//
// Retry resubmits the SAME stored answers to /api/quiz, exactly like
// MarginalisedNotice's re-run (components/results/MarginalisedNotice.jsx):
// it creates a fresh quiz_responses + predictions pair rather than
// mutating this row, so this card's own history entry is untouched — if
// the retry also fails, the original orphan is still here to try again.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const t = en.account.orphan;

export default function OrphanCard({ answers, dateLabel, className }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const canRetry = Boolean(answers) && typeof answers === 'object';

  async function retry() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.id) throw new Error('Malformed response');
      router.push(`/results/${encodeURIComponent(data.id)}`);
      // Stay busy through the navigation — no flash back to idle.
    } catch {
      setError(t.error);
      setBusy(false);
    }
  }

  return (
    <Card
      className={cn(
        'gap-0 border-amber/25 bg-surface p-6 md:p-8',
        className
      )}
    >
      <p className="font-mono text-xs text-muted-foreground">{dateLabel}</p>
      <p className="mt-3 text-[15px] font-medium text-text">{t.title}</p>
      <p className="mt-2 max-w-[52ch] text-[15px] leading-[1.6] text-muted-foreground">
        {t.body}
      </p>

      {canRetry ? (
        <button
          type="button"
          onClick={retry}
          disabled={busy}
          aria-busy={busy || undefined}
          className={cn(
            'mt-5 inline-flex min-h-11 w-fit items-center justify-center rounded-full border px-5',
            'text-sm font-semibold transition-colors duration-200',
            busy
              ? 'border-violet bg-violet/15 text-violet-lt'
              : 'border-hairline text-text/90 hover:border-violet-lt/50 hover:bg-surface-2 active:bg-surface-2',
            // No `outline-none` anywhere — see FlowButton.jsx on how
            // Tailwind v4's outline-none silently kills the ring.
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt',
            'disabled:pointer-events-none'
          )}
        >
          {busy ? t.retrying : t.retry}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 max-w-[52ch] text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
