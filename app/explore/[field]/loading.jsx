// Instant fallback for a single field page — the slowest public route, since
// it reads three aggregate views and renders two charts.
import { Skeleton, SkeletonHeading, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.field}</LoadingAnnouncement>
      <Skeleton className="mt-6 h-4 w-32" />
      <div className="mt-8 max-w-[720px]">
        <SkeletonHeading />
      </div>
      {/* Two chart blocks, at roughly the height the real charts occupy. */}
      <Skeleton className="mt-14 h-[22rem] w-full max-w-[860px] rounded-2xl md:mt-20" />
      <Skeleton className="mt-10 h-[18rem] w-full max-w-[860px] rounded-2xl" />
    </main>
  );
}
