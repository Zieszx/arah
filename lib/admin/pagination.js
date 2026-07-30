// Shared paging arithmetic for the admin tables.
//
// Page state lives in the URL, not in component state. That is deliberate:
// an admin who opens a student's response and presses Back must land on the
// page they were on, and "send me the link to page 3" has to work. It also
// means the controls can be plain <Link>s, so paging keeps working with
// JavaScript unavailable or still loading.
//
// Every value here is treated as hostile — these come from a query string.
// A page of "-1", "1e9", "abc" or "" must produce a sane range, never a
// Postgres error or a negative offset.

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Guards against `?pageSize=100000` turning a paginated screen back into the
// unbounded fetch this whole module exists to remove.
const MAX_PAGE_SIZE = PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1];

function toPositiveInt(raw, fallback) {
  // Number('') is 0 and Number(['5']) is 5 — neither is a page number a user
  // typed, so parse from a string and require it to look like one.
  if (typeof raw !== 'string') return fallback;
  if (!/^\d+$/.test(raw.trim())) return fallback;
  const n = Number(raw.trim());
  if (!Number.isSafeInteger(n) || n < 1) return fallback;
  return n;
}

/** Read `page` and `pageSize` off a plain searchParams object. */
export function parsePageParams(searchParams, defaults = {}) {
  const defaultPageSize = defaults.pageSize ?? DEFAULT_PAGE_SIZE;
  const page = toPositiveInt(searchParams?.page, 1);
  const requested = toPositiveInt(searchParams?.pageSize, defaultPageSize);
  const pageSize = Math.min(requested, MAX_PAGE_SIZE);
  return { page, pageSize };
}

/** Total pages for `total` rows, never below 1 so "Page 1 of 0" can't render. */
export function pageCount(total, pageSize) {
  if (!Number.isFinite(total) || total <= 0) return 1;
  if (!Number.isFinite(pageSize) || pageSize < 1) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Inclusive [from, to] for Supabase's .range(), which is 0-indexed. */
export function rangeFor(page, pageSize) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

/**
 * Where a page actually landed, after the fact.
 *
 * A filter can shrink the result set under an admin who is on page 7, and
 * .range() past the end returns an empty array rather than an error — so the
 * screen would read "no results" when there plainly are some. Callers use
 * this to detect that and re-query the last real page.
 */
export function clampPage(page, total, pageSize) {
  const last = pageCount(total, pageSize);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, last);
}

/**
 * Build a query string that keeps every existing filter and changes only the
 * paging. Anything empty is dropped so the URL stays readable, and `page=1`
 * is omitted because it is the default.
 */
export function pageHref(basePath, searchParams, overrides = {}) {
  const merged = { ...(searchParams ?? {}), ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null) continue;
    const s = String(value);
    if (s === '') continue;
    if (key === 'page' && s === '1') continue;
    params.set(key, s);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Page numbers to render, with nulls marking elided gaps.
 * e.g. 1 … 6 7 [8] 9 10 … 24
 */
export function paginationWindow(page, total, span = 1) {
  const last = total;
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages = new Set([1, last]);
  for (let p = page - span; p <= page + span; p += 1) {
    if (p >= 1 && p <= last) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const out = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push(null);
    out.push(p);
    previous = p;
  }
  return out;
}
