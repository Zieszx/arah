// Cached readers for the three public aggregate views.
//
// Why these three and nothing else: field_stats, field_detail_stats and
// advice_quotes are identical for every visitor, already k-anonymised, banded
// and refresh-gated in Postgres, and they change only when an admin approves
// a contribution. Nothing user-scoped is cached here and nothing here is
// user-scoped — that boundary is the whole safety argument.
//
// Measured before this existed, against production:
//
//   /explore              cold 1.15s   warm 1.20s
//   /explore/engineering  cold 1.47s   warm 1.46s
//   /contribute           cold 0.36s   warm 0.39s   (page since removed)
//
// The explore pages stayed slow when warm because they re-ran their queries
// on every single request; /contribute, which queried nothing, did not — it
// is kept in the table as the control that made the difference legible.
//
// Invalidation is belt and braces. `revalidate` caps staleness at five
// minutes on its own, and revalidateTag(PUBLIC_STATS_TAG) can force a
// refresh immediately rather than waiting out the window — it was wired to
// contribution moderation, which has since been removed. The underlying
// field_stats_cache has its own ≥3-row refresh gate in Postgres
// (0009_field_stats_hardening.sql), so the published numbers may legitimately
// not move even after a successful approval — that gate is a privacy control
// and this cache must not be mistaken for it.
import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/public';
import {
  fetchFieldStats,
  fetchFieldDetailStats,
  fetchAdviceQuotes,
} from '@/lib/supabase/queries';

/** Tag every public aggregate shares, so one call clears all three. */
export const PUBLIC_STATS_TAG = 'public-field-stats';

const REVALIDATE_SECONDS = 300;

export const getFieldStats = unstable_cache(
  async () => fetchFieldStats(createPublicClient()),
  ['field-stats'],
  { tags: [PUBLIC_STATS_TAG], revalidate: REVALIDATE_SECONDS }
);

export const getFieldDetailStats = unstable_cache(
  async () => fetchFieldDetailStats(createPublicClient()),
  ['field-detail-stats'],
  { tags: [PUBLIC_STATS_TAG], revalidate: REVALIDATE_SECONDS }
);

export const getAdviceQuotes = unstable_cache(
  async () => fetchAdviceQuotes(createPublicClient()),
  ['advice-quotes'],
  { tags: [PUBLIC_STATS_TAG], revalidate: REVALIDATE_SECONDS }
);
