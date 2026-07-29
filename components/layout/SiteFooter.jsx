// Site footer — a pure Server Component (nothing here needs the browser).
//
// Carries the admin entry, whose render decision is a security matrix,
// not styling (components/layout/admin-entry.js): for a signed-in
// ordinary student the element is NOT rendered — absent from the served
// HTML, not CSS-hidden — so the document never discloses that an admin
// area exists. Decided server-side, before serialisation, from the same
// cached viewer read the header uses.
//
// The model version is imported from the ML service's own feature spec —
// the single source services/ml/index.py stamps onto every prediction —
// so the footer can never drift from what the model actually reports.
import Link from 'next/link';
import { cn } from '@/lib/utils';
import en from '@/lib/i18n/en';
import { getViewer } from '@/lib/supabase/viewer';
import { adminEntryHref } from './admin-entry';
import featureSpec from '@/services/ml/feature_spec.json';

const FOOTER_LINKS = [
  // /explore and /contribute shipped in Plan 4 (Tasks 2-4). /privacy has
  // not shipped yet — linked now by decision; a 404 there today is
  // expected and fine.
  { href: '/explore', label: en.chrome.footerNav.explore },
  { href: '/contribute', label: en.chrome.footerNav.contribute },
  { href: '/account', label: en.chrome.footerNav.account },
  { href: '/privacy', label: en.chrome.footerNav.privacy },
];

const footerLinkClass = cn(
  'inline-flex min-h-11 w-fit items-center text-sm text-muted-foreground',
  'transition-colors duration-200 hover:text-text active:text-violet-lt',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
);

// The quiet ghost-pill: 1px --hairline border, transparent fill, --muted
// label, --violet-lt on hover — deliberately lower-contrast than a
// FlowButton (staff furniture, not a call to action), but its label still
// clears 4.5:1 (--muted-foreground on --ink measures ~6.8:1) and it keeps
// a visible focus ring. No `outline-none` — Tailwind v4's outline-none
// would unconditionally set --tw-outline-style: none and kill the ring.
const ghostPillClass = cn(
  'inline-flex min-h-11 items-center rounded-full border border-hairline bg-transparent px-5',
  'text-[13px] text-muted-foreground transition-colors duration-200',
  'hover:border-violet-lt/50 hover:text-violet-lt active:text-violet-pl',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt'
);

export default async function SiteFooter() {
  const { user, isAdmin } = await getViewer();
  const adminHref = adminEntryHref({ signedIn: Boolean(user), isAdmin });

  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-12 md:px-16 md:py-16">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[38ch]">
            <Link
              href="/"
              className="font-display inline-flex min-h-11 w-fit items-center text-lg uppercase text-text/90 transition-colors duration-200 hover:text-text active:text-violet-lt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-lt"
              style={{ letterSpacing: '0.20em' }}
            >
              ARAH
            </Link>
            <p className="mt-4 text-[13px] leading-[1.6] text-muted-foreground">
              {en.chrome.footerBlurb}
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-1">
            {FOOTER_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={footerLinkClass}>
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-hairline pt-6">
          <p className="font-mono text-xs text-muted-foreground">
            {en.chrome.trainedOn} · {en.chrome.model} {featureSpec.version}
          </p>
          {/* Signed-in non-admin: adminHref is null and NOTHING renders —
              see admin-entry.js for why this must stay an absence, never
              display:none. */}
          {adminHref ? (
            <Link href={adminHref} className={ghostPillClass}>
              {en.chrome.admin}
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
