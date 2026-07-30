'use client';

// The survey data browser's table. One page of verified alumni rows;
// search, sort and paging are all resolved in Postgres (lib/admin/survey.js
// and lib/admin/surveyQuery.js) and carried in the URL.
//
// This used to hold every row and filter them in the browser, which was
// reasonable at 207 rows and stops being reasonable the moment approved
// contributions start landing — the payload would grow without bound and
// nothing would flag it. Paging a client-filtered list is also incoherent:
// page 2 of a filter the server never applied is not a real page.
//
// PrimeReact's DataTable renders the >=768px view; it is used for its
// component behaviour only (accessible table semantics, a recognisable
// data-table shell) — its own theme CSS is never imported. Every visible
// style below comes from SurveyTable.module.css, a CSS Module: Next.js
// hashes its class names and only loads it as part of THIS route's chunk
// (node_modules/next/dist/docs/01-app/02-guides/package-bundling.md —
// "CSS is automatically scoped to the component/route it's imported
// from"), so there is no vendor stylesheet and no bare-selector reset that
// could ever reach /demo or any other route. Sorting itself is fully
// custom (handleSort below) rather than DataTable's own controlled-sort
// props: sorting is a URL change resolved by the database, so the headers
// are links rather than controlled state DataTable would want to own.
//
// Below 768px the DataTable is replaced entirely by a stacked card list
// (never just hidden-but-still-laid-out) reading the SAME filtered+sorted
// array, so the two views can never disagree about which rows or what
// order.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PendingLink from './PendingLink.jsx';
import { useRouter } from 'next/navigation';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { displayLabel } from '@/lib/i18n/labels';
import { pageHref } from '@/lib/admin/pagination';
import Pagination from './Pagination.jsx';
import en from '@/lib/i18n/en';
import styles from './SurveyTable.module.css';

const t = en.admin.surveyData;

function SortIcon({ active, order }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={styles.sortIcon}
      data-active={active || undefined}
      data-order={active ? order : undefined}
    >
      <path d="M8 3l3.5 4h-7L8 3z" />
      <path d="M8 13l-3.5-4h7L8 13z" />
    </svg>
  );
}

function splitLabel(label) {
  const m = /^(.*?)\s*\((.+?)\)\s*$/.exec(label ?? '');
  return m ? { name: m[1], detail: m[2] } : { name: label, detail: null };
}

/** Shared cell renderers so the desktop table and the mobile cards can
 * never drift apart on how a value is formatted. */
const cell = {
  field(row) {
    const { name, detail } = splitLabel(displayLabel(row.field_of_study));
    return (
      <span className="flex flex-col">
        <span className="font-medium text-ink">{name}</span>
        {detail ? <span className="text-xs text-muted-foreground">{detail}</span> : null}
      </span>
    );
  },
  stream(row) {
    const streams = Array.isArray(row.streams) ? row.streams : [];
    if (streams.length === 0) return <span className="text-muted-foreground">{t.noAdvice}</span>;
    return streams.map(displayLabel).join(', ');
  },
  results(row) {
    return row.spm_results ? displayLabel(row.spm_results) : <span className="text-muted-foreground">{t.noAdvice}</span>;
  },
  preu(row) {
    return row.preu_program ? displayLabel(row.preu_program) : (
      <span className="text-muted-foreground">{t.noAdvice}</span>
    );
  },
  satisfaction(row) {
    if (typeof row.satisfaction !== 'number') {
      return <span className="text-muted-foreground">{t.noAdvice}</span>;
    }
    return (
      <span className="font-mono tabular-nums">
        {row.satisfaction}
        <span className="text-muted-foreground">/5</span>
      </span>
    );
  },
  advice(row) {
    if (!row.advice) return <span className="text-muted-foreground">{t.noAdvice}</span>;
    return (
      <span className={styles.advice} title={row.advice}>
        {row.advice}
      </span>
    );
  },
};

// Explicit widths. Left to itself the table gave `stream` a narrow column and
// wrapped "Technical & Vocational (Sains Komputer, Rekacipta, Lukisan
// Kejuruteraan etc)" over seven lines, making a single row taller than four
// of its neighbours combined. The widths total 100% and the container scrolls
// horizontally below 768px anyway.
const COLUMNS = [
  { key: 'field', label: t.columns.field, sortable: true, width: '19%' },
  { key: 'stream', label: t.columns.stream, sortable: true, width: '22%' },
  { key: 'results', label: t.columns.results, sortable: true, width: '13%' },
  { key: 'preu', label: t.columns.preu, sortable: true, width: '12%' },
  { key: 'satisfaction', label: t.columns.satisfaction, sortable: true, width: '11%' },
  { key: 'advice', label: t.columns.advice, sortable: false, width: '23%' },
];

// How long to wait after the last keystroke before navigating. Search now
// costs a server round trip, so firing per character would queue a request
// per letter and let an earlier, slower response overwrite a later one.
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Search, sort and paging all live in the URL and are resolved in Postgres
 * (lib/admin/survey.js). This component renders one page and links to the
 * others; it deliberately holds no copy of the data and no filtered view of
 * it, so what is on screen is always exactly what the server selected.
 *
 * The one piece of local state is the search box's own text, because an
 * input that only updates after a debounced round trip feels broken to type
 * into. It is reconciled back to the server's value whenever that changes.
 */
export default function SurveyTable({
  rows,
  total,
  page,
  pageCount,
  query,
  sort,
  order,
  basePath,
  searchParams,
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(query ?? '');
  // Skip the debounce on the very first render, otherwise simply landing on
  // the page fires a redundant navigation to the URL already showing.
  const mounted = useRef(false);

  // Keep the box in step when the URL changes underneath it — Back, or the
  // "clear search" link — without stomping on what is being typed. Adjusted
  // during render rather than in an effect: React's own guidance for
  // "reset state when a prop changes", and an effect here would be a
  // cascading render (react-hooks/set-state-in-effect flags it). Keying the
  // whole component off `query` would work too but remounts the input and
  // loses focus mid-search.
  const [syncedQuery, setSyncedQuery] = useState(query ?? '');
  if ((query ?? '') !== syncedQuery) {
    setSyncedQuery(query ?? '');
    setDraft(query ?? '');
  }

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return undefined;
    }
    if ((draft ?? '') === (query ?? '')) return undefined;
    const id = setTimeout(() => {
      // Always back to page 1: page 4 of the previous search is not a page
      // of this one. replace(), not push(), so Back leaves the page rather
      // than walking through every keystroke.
      router.replace(pageHref(basePath, searchParams, { q: draft, page: 1 }), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [draft, query, router, basePath, searchParams]);

  // Clicking the active column flips direction; a new column starts ascending.
  function sortHref(key) {
    const nextOrder = sort === key && order !== 'desc' ? 'desc' : 'asc';
    return pageHref(basePath, searchParams, { sort: key, order: nextOrder, page: 1 });
  }

  function header(col) {
    if (!col.sortable) {
      return <span className={styles.headerLabel}>{col.label}</span>;
    }
    const active = sort === col.key;
    const ascending = order !== 'desc';
    // aria-sort belongs on the header cell (<th>) itself per WAI-ARIA, but
    // PrimeReact's Column owns that element's attributes — this control is
    // the cell's only interactive content, so its accessible name states
    // the sort state directly instead.
    const sortState = active
      ? ascending
        ? ', sorted ascending'
        : ', sorted descending'
      : '';
    // A Link, not a button: sorting is a different URL, so it should be
    // shareable and survive Back — and it keeps working before hydration.
    return (
      <PendingLink
        href={sortHref(col.key)}
        scroll={false}
        className={styles.sortButton}
        aria-label={`Sort by ${col.label}${sortState}`}
      >
        <span className={styles.headerLabel}>{col.label}</span>
        <SortIcon active={active} order={ascending ? 1 : -1} />
      </PendingLink>
    );
  }

  const visible = rows;
  // 1-based, inclusive, and clamped to the real total so the last page reads
  // "181–207 of 207" rather than "181–205 of 207".
  const pageSize = Number(searchParams?.pageSize ?? 25);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  if (total === 0 && !query) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline px-6 text-center">
        <p className="text-sm font-medium text-ink">No verified alumni rows yet.</p>
        <p className="max-w-[46ch] text-sm text-muted-foreground">
          This table fills in once alumni_profiles has verified rows — the seeded 2025 survey
          data, or contributions a reviewer has approved.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">{t.searchLabel}</span>
          <input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="min-h-11 w-full rounded-full border border-hairline bg-surface px-4 text-base text-ink placeholder:text-muted-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
          />
        </label>
        {/* Only shown while searching. The Pagination footer already states
            "Showing 1–25 of 207" on every view, and two different "Showing"
            sentences on one screen read as a bug. What is genuinely useful
            next to the box is how much the search narrowed things. */}
        {query ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular-nums text-ink">{total}</span> {t.countRows}{' '}
            {t.countMatching}
          </p>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline px-6 text-center">
          <div>
            <p className="text-sm font-medium text-ink">{t.emptySearchTitle}</p>
            <p className="mt-1 max-w-[46ch] text-sm text-muted-foreground">{t.emptySearchBody}</p>
          </div>
          <Link
            href={pageHref(basePath, searchParams, { q: '', page: 1 })}
            className="inline-flex min-h-10 items-center rounded-full border border-hairline px-4 text-sm text-violet-ink transition-colors duration-200 hover:border-violet/40 hover:bg-violet-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet active:text-violet-pl"
          >
            {t.clearSearch}
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop / tablet: the real DataTable, >=768px only. The
              table scrolls inside its own overflow-x-auto container — it
              must never widen the page itself (responsive requirement). */}
          <div className={`hidden overflow-x-auto rounded-2xl border border-hairline md:block ${styles.tableRoot}`}>
            <DataTable value={visible} dataKey="id" className={styles.table}>
              {COLUMNS.map((col) => (
                <Column
                  key={col.key}
                  header={() => header(col)}
                  body={(row) => cell[col.key](row)}
                  headerStyle={{ width: col.width }}
                  style={{ width: col.width }}
                  className={col.key === 'advice' ? styles.adviceCol : undefined}
                />
              ))}
            </DataTable>
          </div>

          {/* Phone / small tablet: stacked cards, never a squeezed table. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((row) => (
              <li key={row.id} className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="text-base">{cell.field(row)}</div>
                <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-hairline pt-4 text-sm">
                  {COLUMNS.slice(1, -1).map((col) => (
                    <div key={col.key} className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted-foreground">{col.label}</dt>
                      <dd className="text-right text-ink">{cell[col.key](row)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 border-t border-hairline pt-4 text-sm">
                  <dt className="text-muted-foreground">{t.columns.advice}</dt>
                  <dd className="mt-1.5 leading-[1.6] text-ink">{cell.advice(row)}</dd>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            basePath={basePath}
            searchParams={searchParams}
            page={page}
            pageCount={pageCount}
            totalRows={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
        </>
      )}
    </div>
  );
}
