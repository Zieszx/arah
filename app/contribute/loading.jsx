// /contribute had NO loading fallback, which made it the worst offender in the
// main menu: measured against production, clicking it produced no visual
// change at all for 1287ms. A menu item that looks untouched for over a second
// is exactly how someone ends up clicking it four times.
import { Skeleton, SkeletonHeading, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.page}</LoadingAnnouncement>
      <div className="mt-6 max-w-[720px] md:mt-10">
        <SkeletonHeading />
      </div>
      <div className="mt-12 flex max-w-[720px] flex-col gap-4 md:mt-16">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-6 h-10 w-[min(100%,26rem)]" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
