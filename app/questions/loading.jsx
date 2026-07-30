import { Skeleton, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.questions}</LoadingAnnouncement>
      <div className="mx-auto mt-10 w-full max-w-[720px]">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="mt-10 h-3 w-28" />
        <Skeleton className="mt-4 h-10 w-[min(100%,28rem)]" />
        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
