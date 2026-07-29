'use client';

// Shown only when the stored prediction was marginalised: the student
// skipped the pre-U question, so the model averaged across all five routes
// (weighted by how common each is). This panel says so plainly and offers
// a one-click re-run: pick a route, we POST the SAME stored answers plus
// that route to /api/quiz, and navigate to the fresh prediction.
//
// The re-run never mutates this result — /api/quiz creates a new
// quiz_responses + predictions pair, so the original shared link keeps
// showing exactly what it always showed.
//
// `answers` are the student's own stored raw answers (RLS-scoped read,
// passed down from the server component). Raw spec strings in, raw spec
// strings out — displayLabel is for the visible button text only.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGroups } from '@/lib/features';
import { displayLabel } from '@/lib/i18n/labels';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const PREU_OPTIONS = getGroups().find((g) => g.key === 'preu')?.options ?? [];

export default function MarginalisedNotice({ answers, className }) {
  const router = useRouter();
  const [busyRoute, setBusyRoute] = useState(null);
  const [error, setError] = useState(null);
  const canRerun =
    Boolean(answers) &&
    typeof answers === 'object' &&
    !Array.isArray(answers) &&
    PREU_OPTIONS.length > 0;

  async function rerun(route) {
    if (busyRoute) return;
    setBusyRoute(route);
    setError(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { ...answers, preu: route } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.id) throw new Error('Malformed response');
      router.push(`/results/${encodeURIComponent(data.id)}`);
      // Stay busy while the navigation happens — no flash back to idle.
    } catch {
      setError(en.results.marginalised.error);
      setBusyRoute(null);
    }
  }

  return (
    <aside
      aria-label={en.results.marginalised.notice}
      className={cn(
        'rounded-2xl border border-violet/30 bg-surface p-6 md:p-7',
        className
      )}
    >
      <p className="max-w-[58ch] text-[15px] leading-[1.6] text-text">
        {en.results.marginalised.notice}
      </p>

      {canRerun ? (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {PREU_OPTIONS.map((route) => {
            const busy = busyRoute === route;
            return (
              <button
                key={route}
                type="button"
                onClick={() => rerun(route)}
                disabled={Boolean(busyRoute)}
                aria-busy={busy || undefined}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-full border px-5',
                  'text-sm font-semibold transition-colors duration-200',
                  busy
                    ? 'border-violet bg-violet/15 text-violet-lt'
                    : 'border-hairline text-text/90 hover:border-violet-lt/50 hover:bg-surface-2 active:bg-surface-2',
                  // No `outline-none` anywhere — see FlowButton.jsx on how
                  // Tailwind v4's outline-none silently kills the ring.
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt',
                  'disabled:pointer-events-none',
                  !busy && busyRoute ? 'opacity-40' : null
                )}
              >
                {busy ? en.results.marginalised.busy : displayLabel(route)}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 max-w-[52ch] text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      ) : null}
    </aside>
  );
}
