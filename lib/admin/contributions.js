// Data + mutation logic for /admin/contributions (Plan 5, Task 5).
//
// Reads AND writes alumni_profiles through the service-role client, for
// the same reason lib/admin/overview.js, lib/admin/survey.js and
// lib/admin/responses.js already do: the base table has no select policy
// and (0004_tighten_alumni_grants.sql) no grants at all for anon/
// authenticated, by design — an admin's own moderation console is exactly
// the sanctioned "read/write exact values via the service-role client"
// case those migrations carve out. This module is never imported outside
// app/(admin) and app/api/admin.
//
// Two guard rails the task brief requires, both enforced here rather than
// only at the call site:
//   - approve() and reject() both take `adminId` and stamp it, alongside a
//     server-generated timestamp, onto the row itself
//     (approved_at/approved_by, rejected_at/rejected_by —
//     0011_alumni_moderation.sql). That IS the audit log: who approved
//     what and when is a plain, queryable column, not a side-channel that
//     could drift from the row it describes.
//   - reject() never issues a DELETE. It sets rejected_at/rejected_by and
//     leaves every other column untouched — recoverable by clearing those
//     two columns back to NULL, exactly the brief's "soft-deletes rather
//     than hard-deletes" requirement.
//
// is_admin is NOT re-checked in this module — that check belongs to the
// route handler (app/api/admin/contributions/route.js), which is the
// actual trust boundary an attacker can reach directly. This module is
// only ever called after that check has already passed.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { runPagedQuery } from '@/lib/admin/pagedQuery';

const PENDING_COLUMNS =
  'id, gender, spm_year, state, school_type, streams, spm_results, subjects_enjoyed, ' +
  'subjects_difficult, personality, tasks_enjoyed, characteristics, public_speaking, ' +
  'preu_program, field_of_study, reasons, stream_related, satisfaction, advice, source, created_at';

/**
 * Verified-row count for one field right now, and the suppression state
 * that count implies (<10 = suppressed, matching
 * supabase/migrations/0002_field_stats_k_anonymity.sql's threshold —
 * kept as a literal here rather than imported, since it is a SQL `count
 * (*) >= 10` boundary, not a JS constant anything exports).
 */
async function currentFieldCount(supabase, field) {
  const { count, error } = await supabase
    .from('alumni_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verified', true)
    .eq('field_of_study', field);
  if (error) throw error;
  return count ?? 0;
}

/**
 * How many more verified rows this field needs before the public
 * field_stats view would actually move, per the refresh gate in
 * supabase/migrations/0009_field_stats_hardening.sql: a field's FIRST
 * publish (no field_stats_cache row yet) always proceeds; after that,
 * refresh_field_stats_cache() refuses to move the number until the
 * verified count has changed by >=3 since the row currently cached.
 *
 * Returns null when the cache has no row for this field yet (first
 * publish — approving this one alone would publish it immediately, no
 * "N more needed" framing applies). Otherwise returns the exact count of
 * additional approvals still needed, floored at 0.
 */
async function rowsUntilRefresh(supabase, field, countAfterApproval) {
  const { data, error } = await supabase
    .from('field_stats_cache')
    .select('verified_count_at_refresh')
    .eq('field_of_study', field)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const delta = Math.abs(countAfterApproval - data.verified_count_at_refresh);
  return Math.max(0, 3 - delta);
}

/**
 * Every pending contribution — verified: false, never rejected — oldest
 * first (first-in-first-reviewed), each annotated with the consequence of
 * approving IT SPECIFICALLY: the field's verified count today, what it
 * would become, whether that crosses the n<10 suppression line, and how
 * many more approvals (if any) the refresh gate still needs before the
 * public number would actually move. Returns null on failure — the page
 * renders a designed error state, same convention as the sibling admin
 * data modules.
 */
export async function getPendingContributions({ page = 1, pageSize = 25 } = {}) {
  const supabase = createAdminClient();
  try {
    // Paged in Postgres. The per-row annotation below runs a couple of count
    // queries per distinct field, so an unpaged queue would fan out into
    // dozens of round trips the moment the queue got real — and the reviewer
    // only ever works on the rows in front of them.
    // PostgREST errors (PGRST103) on a range past the end rather than
    // returning an empty page — see lib/admin/pagedQuery.js. That matters
    // most here: approving the last item on the last page shrinks the queue
    // under the reviewer, and without this they would land on an error
    // instead of the page before.
    const pendingFilter = (builder) =>
      builder.eq('verified', false).is('rejected_at', null);

    const paged = await runPagedQuery({
      label: 'admin contributions',
      page,
      pageSize,
      build: () =>
        pendingFilter(
          supabase.from('alumni_profiles').select(PENDING_COLUMNS, { count: 'exact' })
        )
          // created_at then id: first-in-first-reviewed, with a deterministic
          // tiebreak so two rows submitted in the same instant cannot swap
          // between pages.
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
      count: async () => {
        const { count: total } = await pendingFilter(
          supabase.from('alumni_profiles').select('id', { count: 'exact', head: true })
        );
        return total ?? 0;
      },
    });
    if (paged === null) return null;

    const rows = paged.rows;
    const total = paged.total;

    const fields = Array.from(new Set((rows ?? []).map((r) => r.field_of_study)));
    const countByField = new Map(
      await Promise.all(fields.map(async (f) => [f, await currentFieldCount(supabase, f)]))
    );

    const annotated = await Promise.all(
      (rows ?? []).map(async (row) => {
        const before = countByField.get(row.field_of_study) ?? 0;
        const after = before + 1;
        const untilRefresh = await rowsUntilRefresh(supabase, row.field_of_study, after);
        return {
          ...row,
          consequence: {
            countBefore: before,
            countAfter: after,
            wasSuppressed: before < 10,
            willBeSuppressed: after < 10,
            crossesThreshold: before < 10 && after >= 10,
            rowsUntilRefresh: untilRefresh,
          },
        };
      })
    );

    return {
      rows: annotated,
      total,
      page: paged.page,
      pageCount: paged.pageCount,
    };
  } catch (error) {
    console.error('admin contributions: list failed:', error?.code ?? error?.message);
    return null;
  }
}

/**
 * Approve one pending row: verified -> true (which is what actually
 * admits it to field_stats via the field_stats_refresh_on_verify trigger,
 * 0002/0009_*.sql), stamped with who and when. Guards against
 * double-approving or approving an already-rejected row by scoping the
 * update to `verified = false and rejected_at is null` and checking a row
 * actually came back.
 */
export async function approveContribution(id, adminId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('alumni_profiles')
    .update({ verified: true, approved_at: new Date().toISOString(), approved_by: adminId })
    .eq('id', id)
    .eq('verified', false)
    .is('rejected_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: 'not_pending' };
  return { ok: true };
}

/**
 * Reject one pending row: a SOFT delete. verified is left false (it was
 * already false — nothing was ever admitted to field_stats) and
 * rejected_at/rejected_by are stamped; no row is ever removed from the
 * table. Same double-action guard as approveContribution.
 */
export async function rejectContribution(id, adminId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('alumni_profiles')
    .update({ rejected_at: new Date().toISOString(), rejected_by: adminId })
    .eq('id', id)
    .eq('verified', false)
    .is('rejected_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, reason: 'not_pending' };
  return { ok: true };
}
