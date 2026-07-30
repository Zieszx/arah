// The results page reads a stored row and renders the ranked list. A student
// arrives here straight from submitting, so this is the one loading state
// they see at the most invested moment of the whole journey.
import { Skeleton, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.results}</LoadingAnnouncement>
      <div className="mt-14 max-w-[860px] md:mt-24">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-6 h-4 w-64" />
        <Skeleton className="mt-4 h-16 w-[min(100%,32rem)]" />
        <Skeleton className="mt-7 h-5 w-[min(100%,30rem)]" />
      </div>
      <div className="mt-14 flex max-w-[860px] flex-col gap-4 md:mt-24">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </main>
  );
}
