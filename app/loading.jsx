// Root fallback. Covers the landing page and, as the outermost boundary, any
// route that has not declared one of its own — so a new page added later
// cannot silently become another dead click.
import { Skeleton, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 py-8 md:px-16 md:py-12">
      <LoadingAnnouncement>{en.loading.page}</LoadingAnnouncement>
      <div className="mt-16 max-w-[860px] md:mt-24">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-6 h-16 w-[min(100%,34rem)]" />
        <Skeleton className="mt-4 h-16 w-[min(100%,28rem)]" />
        <Skeleton className="mt-8 h-4 w-[min(100%,32rem)]" />
        <Skeleton className="mt-10 h-12 w-52 rounded-full" />
      </div>
    </main>
  );
}
