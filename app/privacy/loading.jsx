import { Skeleton, SkeletonHeading, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.page}</LoadingAnnouncement>
      <div className="mt-6 max-w-[720px] md:mt-10">
        <SkeletonHeading />
      </div>
      <div className="mt-14 flex max-w-[720px] flex-col gap-8 md:mt-20">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-6 w-[min(100%,18rem)]" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        ))}
      </div>
    </main>
  );
}
