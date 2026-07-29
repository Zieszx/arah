// /admin/responses — every questions submission, when it happened, which
// student, whether it marginalised, and the model's top pick (Plan 5, Task
// 4). Personal student data, shown here strictly for support — see
// lib/admin/responses.js's header comment for the RLS/service-role
// reasoning, and note what is deliberately absent from this file: no
// export, no bulk-download link, nothing that turns "an admin looked at
// one record to help a student" into "an admin walked away with all of
// them" (Task 4 brief, and the /signup promise it protects).
//
// The disagreements filter (?filter=disagreements) is the one feature
// this page exists to surface that nothing else in the product can:
// submissions where the SAME student's answers later turn up in a
// contribution reporting a different field than the model's top pick —
// see lib/admin/disagreements.js for exactly how "same student" is
// inferred without a foreign key linking the two tables.
import Link from 'next/link';
import requireAdmin from '@/lib/auth/requireAdmin';
import { getResponsesList } from '@/lib/admin/responses';
import { displayLabel } from '@/lib/i18n/labels';
import { cn } from '@/lib/utils';
import Kicker from '@/components/arah/Kicker.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.responses.metaTitle,
  robots: { index: false, follow: false },
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(iso) {
  const d = new Date(iso ?? '');
  return Number.isNaN(d.getTime()) ? '—' : DATE_FORMAT.format(d);
}

function MarginalisedBadge({ marginalised }) {
  const t = en.admin.responses;
  if (marginalised === null || marginalised === undefined) {
    return <span className="text-sm text-muted-foreground">{t.noPrediction}</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
        marginalised
          ? 'border-amber/30 bg-amber/10 text-amber'
          : 'border-hairline bg-surface-2 text-ink'
      )}
    >
      {marginalised ? t.marginalisedYes : t.marginalisedNo}
    </span>
  );
}

function FilterTabs({ active }) {
  const t = en.admin.responses;
  const tabClass = (isActive) =>
    cn(
      'inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors duration-200',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
      isActive
        ? 'border-violet bg-violet text-white'
        : 'border-hairline text-ink hover:border-violet/40 hover:text-violet-ink active:text-violet-pl'
    );
  return (
    <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={t.title}>
      <Link href="/admin/responses" role="tab" aria-selected={active !== 'disagreements'} className={tabClass(active !== 'disagreements')}>
        {t.filterAll}
      </Link>
      <Link
        href="/admin/responses?filter=disagreements"
        role="tab"
        aria-selected={active === 'disagreements'}
        className={tabClass(active === 'disagreements')}
      >
        {t.filterDisagreements}
      </Link>
    </div>
  );
}

function ResponseRow({ row }) {
  const t = en.admin.responses;
  return (
    <Link
      href={`/admin/responses/${row.id}`}
      className={cn(
        'block rounded-2xl border border-hairline bg-surface p-5 transition-colors duration-200',
        'hover:border-violet/40 hover:bg-violet-soft/40',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
        <div className="flex items-center gap-2">
          {row.disagreementField ? (
            <span className="inline-flex items-center rounded-full border border-violet/30 bg-violet-soft px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-violet-ink">
              {t.disagreesBadge}
            </span>
          ) : null}
          <MarginalisedBadge marginalised={row.marginalised} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="text-base font-medium text-ink">
          {row.studentName || t.unnamedStudent}
        </span>
        <span className="text-[15px] text-ink">
          {row.topField ? displayLabel(row.topField) : t.noPrediction}
        </span>
      </div>
      {row.disagreementField ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t.detail.disagreementModelSaid}: {row.topField ? displayLabel(row.topField) : '—'} ·{' '}
          {t.detail.disagreementTheyContributed}: {displayLabel(row.disagreementField)}
        </p>
      ) : null}
    </Link>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-[52ch] text-sm leading-[1.6] text-muted-foreground">{body}</p>
    </div>
  );
}

export default async function AdminResponsesPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const filter = params?.filter === 'disagreements' ? 'disagreements' : 'all';
  const result = await getResponsesList();
  const t = en.admin.responses;

  const rows = result?.rows ?? null;
  const contributedCount = result?.contributedCount ?? 0;
  const visibleRows =
    rows === null ? null : filter === 'disagreements' ? rows.filter((r) => r.disagreementField) : rows;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <FilterTabs active={filter} />
        {filter === 'disagreements' ? (
          <p className="max-w-[64ch] text-sm leading-[1.6] text-muted-foreground">
            {t.filterDisagreementsHint}
          </p>
        ) : null}
      </div>

      {rows === null ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline text-center">
          <p className="text-sm font-medium text-danger">Couldn’t load submissions just now.</p>
          <p className="text-sm text-muted-foreground">Refresh to retry.</p>
        </div>
      ) : visibleRows.length === 0 ? (
        filter === 'disagreements' ? (
          contributedCount === 0 ? (
            <EmptyState
              title={t.emptyDisagreementsNoContributionsTitle}
              body={t.emptyDisagreementsNoContributionsBody}
            />
          ) : (
            <EmptyState
              title={t.emptyDisagreementsNoneTitle}
              body={t.emptyDisagreementsNoneBody}
            />
          )
        ) : (
          <EmptyState title={t.emptyAllTitle} body={t.emptyAllBody} />
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {visibleRows.map((row) => (
            <li key={row.id}>
              <ResponseRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
