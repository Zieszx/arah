// Covers /login and /signup, which share this group's layout. The auth layout
// reads advice quotes, so there is a real wait here even though it is cached.
import { Skeleton, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center px-6 py-12 md:px-16 md:py-24">
      <LoadingAnnouncement>{en.loading.page}</LoadingAnnouncement>
      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-2xl md:grid-cols-2">
        {/* The gradient panel, and the form beside it. */}
        <Skeleton className="hidden h-[32rem] w-full rounded-none md:block" />
        <div className="flex flex-col gap-5 p-8 md:p-12">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-[min(100%,16rem)]" />
          <Skeleton className="h-4 w-[min(100%,22rem)]" />
          <Skeleton className="mt-4 h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="mt-2 h-12 w-40 rounded-full" />
        </div>
      </div>
    </main>
  );
}
