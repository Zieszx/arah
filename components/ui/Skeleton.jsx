// Loading placeholders for the route-level `loading.jsx` fallbacks.
//
// These exist because navigation in this product genuinely blocks: Next's
// link prefetch returns 404 in production (docs/KNOWN-ISSUES.md #1), so the
// browser has nothing cached and the next page cannot appear until the server
// responds. Without a fallback that is a dead-looking screen, and the
// documented consequence is a student clicking the same menu item three or
// four times.
//
// Server Components on purpose — no 'use client'. A loading fallback that has
// to download and hydrate its own JavaScript before it can appear is the one
// thing worse than no fallback.
//
// The pulse is a CSS animation, so the global prefers-reduced-motion rule in
// app/globals.css collapses it to nothing. A shimmering block is exactly the
// kind of motion that makes some people ill, and it is decoration — the grey
// shape alone already communicates "content is coming".
import { cn } from '@/lib/utils';

export function Skeleton({ className }) {
  return (
    <div
      // aria-hidden: a screen reader gets the route's own loading announcement
      // from Next, and reading out a dozen empty boxes is noise, not help.
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-2', className)}
    />
  );
}

/** A page heading block: kicker, title, standfirst. */
export function SkeletonHeading({ className }) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-11 w-[min(100%,26rem)]" />
      <Skeleton className="h-4 w-[min(100%,38rem)]" />
    </div>
  );
}

/** A run of card placeholders, matching the grid they stand in for. */
export function SkeletonCards({ count = 6, className, cardClassName }) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn('h-48 w-full rounded-2xl', cardClassName)} />
      ))}
    </div>
  );
}

/**
 * A table placeholder. `rows` should match the real page size so the fallback
 * is roughly the height of what replaces it — a fallback much shorter than
 * the content it precedes causes a jump the moment it resolves.
 */
export function SkeletonTable({ rows = 8, className }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Skeleton className="h-11 w-full max-w-sm rounded-full" />
      <div className="overflow-hidden rounded-2xl border border-hairline">
        <Skeleton className="h-12 w-full rounded-none" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="border-t border-hairline p-4">
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The announcement a screen reader actually gets. Visually hidden, polite, so
 * it does not interrupt — but it means a non-sighted user is told the page is
 * loading rather than meeting silence.
 */
export function LoadingAnnouncement({ children }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {children}
    </p>
  );
}
