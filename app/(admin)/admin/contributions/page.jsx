// /admin/contributions — the moderation queue (Plan 5, Task 5).
//
// requireAdmin() runs again here even though app/(admin)/layout.jsx
// already called it — same reasoning as every other admin page.jsx (see
// lib/auth/requireAdmin.js's header comment): a shared layout does not
// re-render on client-side navigation between the sibling routes it
// wraps, so every admin page re-checks. Both calls share one cached DB
// read via React's cache().
//
// The actual approve/reject trust boundary is app/api/admin/contributions/
// route.js, which re-derives is_admin itself — this page's requireAdmin()
// call only decides whether the buttons render at all, never whether a
// direct POST would succeed.
import requireAdmin from '@/lib/auth/requireAdmin';
import { getPendingContributions } from '@/lib/admin/contributions';
import Kicker from '@/components/arah/Kicker.jsx';
import ContributionsQueue from '@/components/admin/ContributionsQueue.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.contributions.metaTitle,
  robots: { index: false, follow: false },
};

export default async function AdminContributionsPage() {
  await requireAdmin();
  const rows = await getPendingContributions();
  const t = en.admin.contributions;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-teal/30 bg-teal-soft/40 px-5 py-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="mt-0.5 size-5 shrink-0 fill-teal"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.5a.75.75 0 0 0-1.5 0v4c0 .2.08.39.22.53l2.5 2.5a.75.75 0 1 0 1.06-1.06L10.75 10.2V6.5Z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium leading-[1.6] text-teal">{t.refreshGateNotice}</p>
      </div>

      {rows === null ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-hairline text-center">
          <p className="text-sm font-medium text-danger">{t.loadErrorTitle}</p>
          <p className="text-sm text-muted-foreground">{t.loadErrorBody}</p>
        </div>
      ) : (
        <ContributionsQueue initialRows={rows} />
      )}
    </div>
  );
}
