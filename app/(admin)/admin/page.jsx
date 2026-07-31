// /admin — Overview (Plan 5, Task 2). The first proof the shell works:
// live counts and a field-distribution chart.
//
// The model accuracy card, and the pending-contributions count, were removed
// at the client's request along with the public accuracy section and the
// contribute feature. Accuracy is still measurable — ml/measure_paths.py
// reports it — it is simply no longer surfaced in the product.
//
// requireAdmin() runs again here even though app/(admin)/layout.jsx
// already called it — see that file's header comment and
// lib/auth/requireAdmin.js's for why a layout-only check is not
// sufficient (Next's own docs warn a shared layout doesn't re-render on
// client-side navigation between the sibling routes it wraps). Both
// calls share one cached DB read via React's cache(), so this is not a
// second round trip.
import requireAdmin from '@/lib/auth/requireAdmin';
import { getOverviewStats } from '@/lib/admin/overview';
import Kicker from '@/components/arah/Kicker.jsx';
import StatCard from '@/components/admin/StatCard.jsx';
import FieldDistributionChartLoader from '@/components/admin/FieldDistributionChartLoader.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.admin.overview.metaTitle,
};

export default async function AdminOverviewPage() {
  await requireAdmin();
  const stats = await getOverviewStats();
  const t = en.admin.overview;
  const s = t.stats;

  const cards = [
    { key: 'totalAlumni', value: stats.totalAlumni, ...s.totalAlumni },
    { key: 'studentsRegistered', value: stats.studentsRegistered, ...s.studentsRegistered },
    { key: 'questionsCompleted', value: stats.questionsCompleted, ...s.questionsCompleted },
    { key: 'predictionsIssued', value: stats.predictionsIssued, ...s.predictionsIssued },
  ];

  const hasFieldData = Array.isArray(stats.fieldDistribution) && stats.fieldDistribution.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Kicker className="text-violet-ink">{t.kicker}</Kicker>
        <h1 className="font-display mt-2 text-3xl text-ink md:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
          {t.body}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {cards.map(({ key, value, label, caption, zeroHint }) => (
          <StatCard key={key} label={label} value={value} caption={caption} zeroHint={zeroHint} />
        ))}
      </dl>

      <section className="rounded-2xl border border-hairline bg-surface p-6 md:p-8">
        <Kicker className="text-violet-ink">{t.chart.kicker}</Kicker>
        <h2 className="font-display mt-2 text-2xl text-ink md:text-[28px]">
          {t.chart.title}
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm leading-[1.6] text-muted-foreground">
          {t.chart.caption}
        </p>
        <div className="mt-6">
          {stats.fieldDistribution === null ? (
            <div className="flex h-[180px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hairline text-center">
              <p className="text-sm font-medium text-danger">
                Couldn’t load the field distribution just now.
              </p>
              <p className="text-sm text-muted-foreground">
                The counts above are unaffected — refresh to retry.
              </p>
            </div>
          ) : hasFieldData ? (
            <FieldDistributionChartLoader data={stats.fieldDistribution} />
          ) : (
            <div className="flex h-[180px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-hairline px-6 text-center">
              <p className="text-sm font-medium text-ink">{t.chart.emptyTitle}</p>
              <p className="max-w-[46ch] text-sm text-muted-foreground">{t.chart.emptyBody}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
