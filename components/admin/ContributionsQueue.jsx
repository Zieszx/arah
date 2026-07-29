'use client';

// The interactive half of /admin/contributions (Plan 5, Task 5): the list
// of pending rows, each with its approve/reject controls and — the task
// brief's central requirement — the consequence of approving THIS row
// spelled out before the click, not discovered after it.
//
// All hooks run unconditionally, before any conditional rendering (the
// project's hook-order rule, lib/motion/useReducedMotion.js's header
// comment) — this component has no early return above its hooks, only
// after them, in the JSX itself.
//
// State lives entirely on the client, seeded from the server-rendered
// initial list: approving/rejecting removes a row from local state on
// success (the row really did leave the queue — no page reload needed to
// see that), and shows an inline status line on failure rather than
// silently doing nothing.
import { useState } from 'react';
import { displayLabel } from '@/lib/i18n/labels';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';

const t = en.admin.contributions;

function fillTemplate(str, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    str
  );
}

/** The consequence sentence(s) for one row's `consequence` object. */
function consequenceLines(consequence, field) {
  const fieldLabel = displayLabel(field);
  const vars = { field: fieldLabel, after: consequence.countAfter };

  const base = consequence.crossesThreshold
    ? fillTemplate(t.consequence.crosses, vars)
    : consequence.willBeSuppressed
      ? fillTemplate(t.consequence.staysSuppressed, vars)
      : fillTemplate(t.consequence.staysShown, vars);

  let refresh;
  if (consequence.rowsUntilRefresh === null) {
    refresh = fillTemplate(t.consequence.firstPublish, vars);
  } else if (consequence.rowsUntilRefresh === 0) {
    refresh = fillTemplate(t.consequence.refreshesNow, vars);
  } else {
    refresh = fillTemplate(t.consequence.needsMore, {
      ...vars,
      n: consequence.rowsUntilRefresh,
      plural: consequence.rowsUntilRefresh === 1 ? '' : 's',
    });
  }

  return { base, refresh };
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDate(iso) {
  const d = new Date(iso ?? '');
  return Number.isNaN(d.getTime()) ? '—' : DATE_FORMAT.format(d);
}

function labelList(values) {
  return Array.isArray(values) && values.length > 0
    ? values.map(displayLabel).join(', ')
    : '—';
}

const ANSWER_FIELDS = [
  { key: 'streams', label: 'Stream', type: 'list' },
  { key: 'subjects_enjoyed', label: 'Subjects enjoyed', type: 'list' },
  { key: 'subjects_difficult', label: 'Subjects found difficult', type: 'list' },
  { key: 'tasks_enjoyed', label: 'Tasks enjoyed', type: 'list' },
  { key: 'characteristics', label: 'Characteristics', type: 'list' },
  { key: 'personality', label: 'Personality', type: 'value' },
  { key: 'spm_results', label: 'SPM results', type: 'value' },
  { key: 'preu_program', label: 'Pre-U route', type: 'value' },
  { key: 'school_type', label: 'School type', type: 'value' },
  { key: 'public_speaking', label: 'Public speaking (1–5)', type: 'raw' },
];

const actionButtonBase = cn(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 text-sm font-medium',
  'transition-colors duration-200',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
  'disabled:pointer-events-none disabled:opacity-50'
);

function ApproveButton({ busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        actionButtonBase,
        'border-violet bg-violet text-white hover:bg-violet-ink active:bg-violet-pl'
      )}
    >
      {busy ? t.approving : t.approve}
    </button>
  );
}

// "Destructive actions should look destructive but not alarming — a quiet
// danger treatment, not a red slab": an outlined danger-tinted pill, same
// shape/weight as Approve, never a filled red button.
function RejectButton({ busy, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        actionButtonBase,
        'border-hairline text-muted-foreground hover:border-danger/40 hover:text-danger active:text-danger'
      )}
    >
      {busy ? t.rejecting : t.reject}
    </button>
  );
}

function RejectConfirm({ busy, onConfirm, onCancel }) {
  return (
    <div
      role="alertdialog"
      aria-label={t.confirmRejectTitle}
      className="flex flex-col gap-3 rounded-xl border border-danger/25 bg-danger/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-sm font-medium text-ink">{t.confirmRejectTitle}</p>
        <p className="mt-1 max-w-[52ch] text-sm leading-[1.5] text-muted-foreground">
          {t.confirmRejectBody}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={cn(
            actionButtonBase,
            'border-hairline text-ink hover:border-violet/40 hover:text-violet-ink active:text-violet-pl'
          )}
        >
          {t.confirmRejectCancel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={cn(
            actionButtonBase,
            'border-danger/40 bg-danger/10 text-danger hover:bg-danger/20 active:bg-danger/25'
          )}
        >
          {busy ? t.rejecting : t.confirmRejectConfirm}
        </button>
      </div>
    </div>
  );
}

function ContributionCard({ row, onApprove, onReject, busy, statusMessage }) {
  const { base, refresh } = consequenceLines(row.consequence, row.field_of_study);
  const [confirmingReject, setConfirmingReject] = useState(false);

  return (
    <li className="rounded-2xl border border-hairline bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-xl text-ink md:text-2xl">
          {displayLabel(row.field_of_study)}
        </h3>
        <span className="font-mono text-sm text-muted-foreground">
          {t.submittedLabel} {formatDate(row.created_at)}
        </span>
      </div>

      {/* The consequence, front and centre — this is the whole point of
          the screen: shown BEFORE the click, not discoverable only after. */}
      <div className="mt-4 rounded-xl border border-violet/20 bg-violet-soft/40 p-4">
        <p className="text-sm leading-[1.6] text-ink">{base}</p>
        <p className="mt-1.5 text-sm leading-[1.6] text-violet-ink">{refresh}</p>
      </div>

      <details className="mt-4 group">
        <summary
          className={cn(
            'flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-1 text-sm font-medium text-violet-ink select-none',
            'transition-colors duration-200 hover:text-violet',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
          )}
        >
          <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-90">
            ▸
          </span>
          {t.answersKicker}
        </summary>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-hairline pt-4 sm:grid-cols-2">
          {ANSWER_FIELDS.map(({ key, label, type }) => (
            <div key={key}>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm text-ink">
                {type === 'list'
                  ? labelList(row[key])
                  : type === 'raw'
                    ? (row[key] ?? '—')
                    : row[key]
                      ? displayLabel(row[key])
                      : '—'}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.reasonsLabel}
          </p>
          <p className="mt-1 text-sm leading-[1.5] text-ink">{labelList(row.reasons)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.satisfactionLabel}
          </p>
          <p className="mt-1 font-mono text-sm text-ink">
            {typeof row.satisfaction === 'number' ? `${row.satisfaction} / 5` : '—'}
          </p>
        </div>
      </div>

      {row.advice ? (
        <div className="mt-4 border-t border-hairline pt-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t.adviceLabel}
          </p>
          <p className="mt-1.5 max-w-prose text-sm leading-[1.6] text-ink">{row.advice}</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-hairline pt-5">
        {statusMessage ? (
          <p role="status" className="text-sm text-danger">
            {statusMessage}
          </p>
        ) : null}

        {confirmingReject ? (
          <RejectConfirm
            busy={busy === 'reject'}
            onConfirm={() => onReject()}
            onCancel={() => setConfirmingReject(false)}
          />
        ) : (
          <div className="flex items-center justify-end gap-3">
            <RejectButton busy={busy === 'reject'} onClick={() => setConfirmingReject(true)} />
            <ApproveButton busy={busy === 'approve'} onClick={() => onApprove()} />
          </div>
        )}
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline px-6 py-14 text-center">
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-10 text-violet-lt">
        <path
          fill="currentColor"
          d="M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm9.5 15.5-11 11a1.75 1.75 0 0 1-2.47 0l-5.5-5.5a1.75 1.75 0 1 1 2.47-2.47l4.27 4.27 9.77-9.77a1.75 1.75 0 1 1 2.46 2.47Z"
        />
      </svg>
      <p className="text-base font-medium text-ink">{t.emptyTitle}</p>
      <p className="max-w-[46ch] text-sm leading-[1.6] text-muted-foreground">{t.emptyBody}</p>
    </div>
  );
}

export default function ContributionsQueue({ initialRows }) {
  const [rows, setRows] = useState(initialRows);
  // id -> 'approve' | 'reject' currently in flight for that row.
  const [busyById, setBusyById] = useState({});
  // id -> error string to show inline on that row.
  const [errorById, setErrorById] = useState({});

  async function act(id, action) {
    setBusyById((prev) => ({ ...prev, [id]: action }));
    setErrorById((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetch('/api/admin/contributions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || t.errorToast);
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setErrorById((prev) => ({ ...prev, [id]: err?.message || t.errorToast }));
    } finally {
      setBusyById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  if (rows.length === 0) return <EmptyState />;

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <ContributionCard
          key={row.id}
          row={row}
          busy={busyById[row.id]}
          statusMessage={errorById[row.id]}
          onApprove={() => act(row.id, 'approve')}
          onReject={() => act(row.id, 'reject')}
        />
      ))}
    </ul>
  );
}
