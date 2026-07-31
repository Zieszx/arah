// One fallback for every admin route. loading.jsx applies to its own segment
// AND everything nested below it, so this single file covers every console
// section rather than one near-identical copy per section.
//
// The admin tables are the routes where the missing feedback was worst: every
// pagination link, sort header and search is a fresh server round trip, and
// with prefetch 404ing (docs/KNOWN-ISSUES.md #1) there was nothing on screen
// between the click and the response.
import { SkeletonHeading, SkeletonTable, LoadingAnnouncement } from '@/components/ui/Skeleton.jsx';
import en from '@/lib/i18n/en';

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <LoadingAnnouncement>{en.loading.admin}</LoadingAnnouncement>
      <SkeletonHeading />
      <SkeletonTable rows={8} />
    </div>
  );
}
