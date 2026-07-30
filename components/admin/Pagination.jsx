// Pagination controls for the admin tables. A Server Component on purpose:
// every control is a real <Link>, so paging works before hydration and with
// JavaScript unavailable, and each page is a genuine URL an admin can share
// or return to with the Back button.
//
// Renders nothing at all when there is only one page — a lone disabled
// "Page 1 of 1" is noise on a screen that already states its total.
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { pageHref, paginationWindow, PAGE_SIZE_OPTIONS } from '@/lib/admin/pagination';
import en from '@/lib/i18n/en';

const t = en.admin.pagination;

const controlClass = cn(
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border px-3',
  'text-sm transition-colors duration-200',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet'
);

const enabledClass =
  'border-hairline text-ink hover:border-violet/40 hover:bg-violet-soft/40 hover:text-violet-ink';

// A disabled control is a <span>, not a disabled <a>: there is no such thing
// as a disabled link, and rendering one that still navigates is worse than
// rendering a plain label.
const disabledClass = 'border-transparent text-muted-foreground/50';

function Step({ href, disabled, label, children }) {
  if (disabled) {
    return (
      <span aria-hidden="true" className={cn(controlClass, disabledClass)}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(controlClass, enabledClass)}>
      {children}
    </Link>
  );
}

export default function Pagination({
  basePath,
  searchParams,
  page,
  pageCount: total,
  totalRows,
  rangeStart,
  rangeEnd,
  showPageSize = true,
}) {
  const single = total <= 1;

  return (
    <div className="flex flex-col gap-4 border-t border-hairline pt-4 md:flex-row md:items-center md:justify-between">
      {/* Always shown, even on a single page — "Showing 1–207 of 207" is the
          sentence that tells an admin nothing is being silently withheld. */}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {totalRows === 0
          ? t.empty
          : `${t.showing} ${rangeStart}–${rangeEnd} ${t.of} ${totalRows}`}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        {showPageSize ? (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">{t.perPage}</span>
            <div className="flex items-center gap-1">
              {PAGE_SIZE_OPTIONS.map((size) => {
                const active = Number(searchParams?.pageSize ?? 25) === size;
                return (
                  <Link
                    key={size}
                    // Changing page size must return to page 1: staying on
                    // page 7 while quadrupling the page size lands past the
                    // end of the data.
                    href={pageHref(basePath, searchParams, { pageSize: size, page: 1 })}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'inline-flex min-h-8 items-center rounded-md px-2 text-sm transition-colors duration-200',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet',
                      active
                        ? 'bg-violet-soft/70 font-medium text-violet-ink'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-ink'
                    )}
                  >
                    {size}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {single ? null : (
          <nav aria-label={t.label} className="flex items-center gap-1">
            <Step
              href={pageHref(basePath, searchParams, { page: page - 1 })}
              disabled={page <= 1}
              label={t.previous}
            >
              ←
            </Step>

            {paginationWindow(page, total).map((p, i) =>
              p === null ? (
                <span
                  // Index is a safe key here: the window is regenerated whole
                  // on every render and its entries have no identity.
                  key={`gap-${i}`}
                  aria-hidden="true"
                  className="px-1 text-sm text-muted-foreground/60"
                >
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={pageHref(basePath, searchParams, { page: p })}
                  aria-label={`${t.page} ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(
                    controlClass,
                    p === page
                      ? 'border-violet bg-violet-soft/70 font-medium text-violet-ink'
                      : enabledClass
                  )}
                >
                  {p}
                </Link>
              )
            )}

            <Step
              href={pageHref(basePath, searchParams, { page: page + 1 })}
              disabled={page >= total}
              label={t.next}
            >
              →
            </Step>
          </nav>
        )}
      </div>
    </div>
  );
}
