// /explore — every field, sorted by sample size (Plan 4, Task 2). A Server
// Component throughout: field_stats is anon-readable (0002/0003 migrations)
// and every card is built from that single query result, no client state.
//
// Honesty carried onto this page: the two fields under n=10 (Creative Art
// 9, Humanities & Social Sciences 7) render their sample size and a plain
// sentence explaining why the rest is withheld — never a fabricated 0, "—"
// or imputed value (see FieldCard.jsx and components/results/AlumniContext.jsx
// for the identical rule on /results).
//
// Cards stagger in per §5b via StaggerReveal, called directly here (not
// through an intermediate client wrapper) so the FieldCard elements
// themselves stay server-rendered — they're created in this Server
// Component's scope and merely passed through StaggerReveal's `children`
// slot, the same composition StaggerReveal's own module doc describes.
import { createClient } from '@/lib/supabase/server';
import { fetchFieldStats } from '@/lib/supabase/queries';
import { getSlugForField } from '@/lib/explore/fields';
import { sampleSizeSortWeight } from '@/lib/explore/sampleSize';
import Kicker from '@/components/arah/Kicker.jsx';
import FlowButton from '@/components/arah/FlowButton.jsx';
import StaggerReveal from '@/components/motion/StaggerReveal.jsx';
import FieldCard from '@/components/explore/FieldCard.jsx';
import en from '@/lib/i18n/en';

export const metadata = {
  title: en.explore.metaTitle,
  description: en.explore.metaDescription,
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const rows = await fetchFieldStats(supabase);

  // Sorted by (banded) sample size descending. Never by the exact
  // unsuppressed count — that number isn't in the row at all any more
  // (0009_field_stats_hardening.sql) — so this sorts by band, then
  // alphabetically within a band or among suppressed fields, rather than
  // by a precision the view deliberately no longer exposes.
  const sorted = [...rows].sort((a, b) => {
    const weight =
      sampleSizeSortWeight(b.sample_size, b.sample_size_band) -
      sampleSizeSortWeight(a.sample_size, a.sample_size_band);
    return weight !== 0 ? weight : a.field_of_study.localeCompare(b.field_of_study);
  });

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-14 md:px-16 md:py-20">
      <section className="max-w-[720px]">
        <Kicker>{en.explore.kicker}</Kicker>
        <h1 className="font-display mt-6 max-w-[16ch] text-balance text-[42px] leading-[1.08] md:text-[56px]">
          {en.explore.title}
        </h1>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground md:text-base">
          {en.explore.body}
        </p>
      </section>

      <section className="mt-12 md:mt-16">
        <StaggerReveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((row, i) => {
            const slug = getSlugForField(row.field_of_study);
            if (!slug) return null;
            return (
              <FieldCard
                key={row.field_of_study}
                raw={row.field_of_study}
                slug={slug}
                sampleSize={row.sample_size}
                sampleSizeBand={row.sample_size_band}
                avgSatisfaction={row.avg_satisfaction}
                commonPreu={row.common_preu}
                suppressed={row.suppressed}
                isLead={i === 0}
              />
            );
          })}
        </StaggerReveal>
      </section>

      <section className="mt-16 max-w-[720px] border-t border-hairline pt-10 md:mt-24 md:pt-14">
        <h2 className="font-display text-[24px] md:text-[30px]">
          {en.explore.ctaTitle}
        </h2>
        <p className="mt-4 max-w-[52ch] text-[15px] leading-[1.6] text-muted-foreground md:text-base">
          {en.explore.ctaBody}
        </p>
        <FlowButton href="/questions" className="mt-8 w-fit">
          {en.explore.ctaButton}
        </FlowButton>
      </section>
    </main>
  );
}
