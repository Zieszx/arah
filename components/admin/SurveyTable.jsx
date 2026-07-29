'use client';

// The survey data browser's table (Task 3). All 207 verified alumni rows,
// searched and sorted entirely client-side — see lib/admin/surveyTable.js's
// header comment for why that's the right call at this size.
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
// props, because the column keys here (e.g. "stream", a joined array) do
// not map onto a literal row property DataTable's default comparator could
// use — see lib/admin/surveyTable.js#SORT_ACCESSORS for the real
// comparators.
//
// Below 768px the DataTable is replaced entirely by a stacked card list
// (never just hidden-but-still-laid-out) reading the SAME filtered+sorted
// array, so the two views can never disagree about which rows or what
// order.
import { useMemo, useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { displayLabel } from '@/lib/i18n/labels';
import { filterRows, sortRows } from '@/lib/admin/surveyTable';
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

const COLUMNS = [
  { key: 'field', label: t.columns.field, sortable: true },
  { key: 'stream', label: t.columns.stream, sortable: true },
  { key: 'results', label: t.columns.results, sortable: true },
  { key: 'preu', label: t.columns.preu, sortable: true },
  { key: 'satisfaction', label: t.columns.satisfaction, sortable: true },
  { key: 'advice', label: t.columns.advice, sortable: false },
];

export default function SurveyTable({ rows }) {
  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState('field');
  const [sortOrder, setSortOrder] = useState(1);

  const filtered = useMemo(() => filterRows(rows, query), [rows, query]);
  const visible = useMemo(
    () => sortRows(filtered, sortField, sortOrder),
    [filtered, sortField, sortOrder]
  );

  function handleSort(key) {
    if (sortField === key) {
      setSortOrder((o) => (o === 1 ? -1 : 1));
    } else {
      setSortField(key);
      setSortOrder(1);
    }
  }

  function header(col) {
    if (!col.sortable) {
      return <span className={styles.headerLabel}>{col.label}</span>;
    }
    const active = sortField === col.key;
    // aria-sort belongs on the header cell (<th>) itself per WAI-ARIA, but
    // PrimeReact's Column owns that element's attributes — this button is
    // the cell's only interactive content, so its accessible name states
    // the sort state directly instead (avoids the invalid
    // aria-sort-on-role=button combination eslint-plugin-jsx-a11y flags).
    const sortState = active ? (sortOrder === 1 ? ', sorted ascending' : ', sorted descending') : '';
    return (
      <button
        type="button"
        onClick={() => handleSort(col.key)}
        className={styles.sortButton}
        aria-label={`Sort by ${col.label}${sortState}`}
      >
        <span className={styles.headerLabel}>{col.label}</span>
        <SortIcon active={active} order={sortOrder} />
      </button>
    );
  }

  if (rows.length === 0) {
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="min-h-11 w-full rounded-full border border-hairline bg-surface px-4 text-base text-ink placeholder:text-muted-foreground transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          {t.countShowing}{' '}
          <span className="font-mono tabular-nums text-ink">{visible.length}</span> {t.countOf}{' '}
          <span className="font-mono tabular-nums text-ink">{rows.length}</span> {t.countRows}
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-hairline px-6 text-center">
          <div>
            <p className="text-sm font-medium text-ink">{t.emptySearchTitle}</p>
            <p className="mt-1 max-w-[46ch] text-sm text-muted-foreground">{t.emptySearchBody}</p>
          </div>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="min-h-10 rounded-full border border-hairline px-4 text-sm text-violet-ink transition-colors duration-200 hover:border-violet/40 hover:bg-violet-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet active:text-violet-pl"
          >
            {t.clearSearch}
          </button>
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
        </>
      )}
    </div>
  );
}
