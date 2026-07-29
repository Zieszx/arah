// Data for the admin overview screen (app/(admin)/admin/page.jsx).
//
// Reads through the service-role client deliberately: field_stats and
// field_detail_stats are banded and refresh-gated for the public (0009/0010
// hardening migrations), by design — but an admin viewing their own
// internal console is exactly the "may read exact values via the
// service-role client" case those migrations' comments carve out. This
// module is never imported by anything under app/api or a public page —
// only app/(admin)/admin/page.jsx, which requireAdmin() already gates.
//
// Every count is fetched independently and fails soft: one table being
// briefly unreachable degrades that single stat to "unavailable", not the
// whole page to a crash. `value: null` (not 0) is how a caller tells
// "we don't know" apart from "we know, and it's zero" — StatCard.jsx
// renders those two states differently on purpose.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Strips the trailing "(details, more details)" parenthetical the same
 * way lib/explore/fields.js does for slugs — kept as a local copy rather
 * than an import because fields.js's version is private (not exported)
 * and this call site only needs the string, not the slug. Stripping the
 * parenthetical also removes the one genuine survey typo ("Dentristry"),
 * which lives entirely inside that parenthetical, so no displayLabel()
 * correction is needed for chart labels.
 */
function shortFieldLabel(raw) {
  return typeof raw === 'string' ? raw.replace(/\s*\(.+?\)\s*$/, '').trim() : raw;
}

async function safeCount(supabase, table, filters) {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    for (const [col, val] of Object.entries(filters ?? {})) {
      query = query.eq(col, val);
    }
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error(`admin overview: count(${table}) failed:`, error?.code ?? error?.message);
    return null;
  }
}

/**
 * "Pending" specifically means the same set /admin/contributions moderates
 * — verified: false AND never rejected (0011_alumni_moderation.sql's
 * rejected_at). A plain `safeCount(..., { verified: false })` would keep
 * counting a row here forever after it's rejected, since rejection never
 * flips `verified`; this dedicated query adds the `rejected_at is null`
 * half of that predicate safeCount's simple eq-filters object can't
 * express.
 */
async function safeCountPending(supabase) {
  try {
    const { count, error } = await supabase
      .from('alumni_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verified', false)
      .is('rejected_at', null);
    if (error) throw error;
    return count ?? 0;
  } catch (error) {
    console.error(
      'admin overview: count(alumni_profiles pending) failed:',
      error?.code ?? error?.message
    );
    return null;
  }
}

async function safeFieldDistribution(supabase) {
  try {
    const { data, error } = await supabase
      .from('alumni_profiles')
      .select('field_of_study')
      .eq('verified', true);
    if (error) throw error;
    const counts = new Map();
    for (const row of data ?? []) {
      const label = shortFieldLabel(row.field_of_study);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts, ([field, count]) => ({ field, count })).sort(
      (a, b) => b.count - a.count
    );
  } catch (error) {
    console.error(
      'admin overview: field distribution failed:',
      error?.code ?? error?.message
    );
    return null;
  }
}

/**
 * Every figure the overview page's stat cards and chart need, fetched in
 * parallel. Shape:
 *   { totalAlumni, studentsRegistered, questionsCompleted,
 *     predictionsIssued, pendingContributions, fieldDistribution }
 * Each count is `number | null` (null = unavailable, not zero).
 * `fieldDistribution` is `{field, count}[] | null` sorted by count desc.
 */
export async function getOverviewStats() {
  const supabase = createAdminClient();

  const [
    totalAlumni,
    studentsRegistered,
    questionsCompleted,
    predictionsIssued,
    pendingContributions,
    fieldDistribution,
  ] = await Promise.all([
    safeCount(supabase, 'alumni_profiles', { verified: true }),
    safeCount(supabase, 'profiles'),
    safeCount(supabase, 'quiz_responses'),
    safeCount(supabase, 'predictions'),
    safeCountPending(supabase),
    safeFieldDistribution(supabase),
  ]);

  return {
    totalAlumni,
    studentsRegistered,
    questionsCompleted,
    predictionsIssued,
    pendingContributions,
    fieldDistribution,
  };
}

export { shortFieldLabel };
