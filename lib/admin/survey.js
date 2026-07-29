// Data for the admin survey browser (Task 3, /admin/survey-data).
//
// Reads through the service-role client on purpose: alumni_profiles has no
// select policy at all (0001_init.sql) and no anon/authenticated table
// grants whatsoever (0004_tighten_alumni_grants.sql) — the raw rows,
// including free-text advice, are never client-readable by design. An
// admin browsing their own internal console, gated by requireAdmin() on
// every page.jsx that calls this module, is exactly the "may read exact
// values via the service-role client" case those migrations carve out.
// This module must never be imported by anything under app/api or a public
// page — only app/(admin)/admin/survey-data/page.jsx.
//
// `advice` is included here deliberately: this page is the one sanctioned
// place a human ever sees the raw free-text (see that page's header
// comment for the "do not republish attributed" notice). Nowhere else in
// the app selects this column for display.
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const SELECT_COLUMNS =
  'id, field_of_study, streams, spm_results, preu_program, satisfaction, advice';

/**
 * All verified alumni rows (207 at last count), raw — every string keeps
 * its raw survey spelling (typos included); the caller renders through
 * lib/i18n/labels.js#displayLabel at the last moment, never here.
 * Ordered by field_of_study then id for a stable, deterministic default
 * sort before the client applies its own.
 */
export async function getSurveyRows() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('alumni_profiles')
    .select(SELECT_COLUMNS)
    .eq('verified', true)
    .order('field_of_study', { ascending: true })
    .order('id', { ascending: true });
  if (error) {
    console.error('admin survey-data: alumni_profiles select failed:', error.code ?? error.message);
    return null;
  }
  return data ?? [];
}
