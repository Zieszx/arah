// /admin/responses — every questions submission, when it happened, which
// student, whether it marginalised, and the model's top pick (Plan 5, Task
// 4). Personal student data, shown here strictly for support — see
// lib/admin/responses.js's header comment for the RLS/service-role
// reasoning, and note what is deliberately absent from this file: no
// export, no bulk-download link, nothing that turns "an admin looked at
// one record to help a student" into "an admin walked away with all of
// them" (Task 4 brief, and the /signup promise it protects).
//
// This page used to carry a second tab — a "disagreements" filter over
// submissions whose answers later reappeared in a /contribute submission
// naming a different field. /contribute was removed at the client's
// request, so the filter could never match again and went with it: a
// control that always returns nothing reads as broken, not as empty.
import Link from 'next/link';
import requireAdmin from '@/lib/auth/requireAdmin';
import { getResponsesList } from '@/lib/admin/responses';
import { parsePageParams } from '@/lib/admin/pagination';
import { displayLabel } from '@/lib/i18n/labels';
import { cn } from '@/lib/utils';
import Kicker from '@/components/arah/Kicker.jsx';
import Pagination from '@/components/admin/Pagination.jsx';
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
        <MarginalisedBadge marginalised={row.marginalised} />
      </div>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <span className="text-base font-medium text-ink">
          {row.studentName || t.unnamedStudent}
        </span>
        <span className="text-[15px] text-ink">
          {row.topField ? displayLabel(row.topField) : t.noPrediction}
        </span>
      </div>
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
  const params = (await searchParams) ?? {};
  const { page, pageSize } = parsePageParams(params);
  const result = await getResponsesList({ page, pageSize });
  const t = en.admin.responses;

  const rows = result?.rows ?? null;

  const canonicalParams = {
    page: result?.page ?? page,
    pageSize,
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      {rows === null ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline text-center">
          <p className="text-sm font-medium text-danger">Couldn’t load submissions just now.</p>
          <p className="text-sm text-muted-foreground">Refresh to retry.</p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={t.emptyAllTitle} body={t.emptyAllBody} />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id}>
                <ResponseRow row={row} />
              </li>
            ))}
          </ul>

          <Pagination
            basePath="/admin/responses"
            searchParams={canonicalParams}
            page={result.page}
            pageCount={result.pageCount}
            totalRows={result.total}
            rangeStart={result.total === 0 ? 0 : (result.page - 1) * pageSize + 1}
            rangeEnd={Math.min(result.page * pageSize, result.total)}
          />
        </>
      )}
    </div>
  );
}
