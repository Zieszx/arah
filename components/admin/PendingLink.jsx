'use client';

// A <Link> that shows it has been clicked.
//
// route-level loading.jsx covers a whole page swap, but the admin tables
// change via searchParams — page 2, a sort header, a page size — and those
// re-render in place. Between the click and the server responding there was no
// feedback at all, and the reported consequence was people clicking the same
// control repeatedly because nothing appeared to happen.
//
// useLinkStatus is Next's hook for exactly this, and its documentation names
// our situation: it is for when "prefetching is disabled or in progress
// meaning navigation is blocked". Prefetch returns 404 in this deployment
// (docs/KNOWN-ISSUES.md #1), so every one of these navigations blocks on the
// server.
//
// The hook must be called from a component INSIDE the <Link>, not from the one
// that renders it — it reads the nearest Link ancestor. That is why the
// indicator is its own component rather than a flag on this one.
import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { cn } from '@/lib/utils';

function PendingOverlay() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      // Decoration only. The route announcement already tells a screen reader
      // that something is loading; a second live region here would talk over
      // it.
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        'animate-pulse bg-violet-soft/70'
      )}
    />
  );
}

export default function PendingLink({ href, className, children, ...props }) {
  return (
    <Link href={href} className={cn('relative', className)} {...props}>
      {children}
      <PendingOverlay />
    </Link>
  );
}
