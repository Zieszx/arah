import { Skeleton, SkeletonHeading, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.account}</LoadingAnnouncement>
      <div className="mt-6 max-w-[860px] md:mt-10">
        <SkeletonHeading />
      </div>
      <div className="mt-14 flex max-w-[860px] flex-col gap-4 md:mt-20">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </main>
  );
}
