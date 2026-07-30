// Instant fallback for /explore. See components/ui/Skeleton.jsx for why these
// matter more here than in a typical app: link prefetch 404s in production, so
// navigation genuinely waits on the server with nothing to show.
//
// The shape deliberately mirrors app/explore/page.jsx — heading, then a
// three-column card grid — so the swap when real content arrives is a fill,
// not a reflow.
import { SkeletonHeading, SkeletonCards, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.explore}</LoadingAnnouncement>
      <div className="mt-6 md:mt-10">
        <SkeletonHeading />
      </div>
      <SkeletonCards
        count={9}
        className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:mt-20"
        cardClassName="h-[22rem]"
      />
    </main>
  );
}
