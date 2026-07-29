-- Contribution moderation (Plan 5, Task 5) ---------------------------------
--
-- /admin/contributions needs two things 0001_init.sql's alumni_profiles
-- never had: an audit trail for who approved a submission and when, and a
-- way to reject one WITHOUT hard-deleting it (the task brief is explicit:
-- "reject soft-deletes rather than hard-deletes so a mistake is
-- recoverable" — a hard `delete` has no undo once the row and its
-- free-text advice are gone).
--
-- Four columns, all nullable (every existing row gets NULL in all four,
-- which is exactly "never moderated" — the correct default for 207 rows
-- that were approved by the original 2025 survey import, not through this
-- UI):
--   approved_at / approved_by  — set together, only by the approve action
--                                 (app/api/admin/contributions/route.js),
--                                 alongside verified: true.
--   rejected_at / rejected_by  — set together, only by the reject action.
--                                 verified stays false; the row is simply
--                                 excluded from the pending queue from then
--                                 on (see the partial index below) — the
--                                 data itself is untouched and trivially
--                                 recoverable by clearing these two columns
--                                 back to NULL.
--
-- `on delete set null` (not cascade) on both FKs: if an admin's profile is
-- ever removed, the historical fact "this row was approved/rejected on
-- this date" should not vanish or take the alumni row down with it — only
-- the "by whom" attribution degrades to unknown.
--
-- Idempotent: `add column if not exists` and `create index if not exists`
-- are both safe to re-run.
alter table alumni_profiles
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references profiles (id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejected_by uuid references profiles (id) on delete set null;

-- The moderation queue's own query (lib/admin/contributions.js) and the
-- overview page's "pending contributions" count (lib/admin/overview.js)
-- both filter on exactly this predicate — a partial index keeps that scan
-- cheap regardless of how many rejected rows accumulate over time.
create index if not exists alumni_pending_idx
  on alumni_profiles (created_at)
  where not verified and rejected_at is null;
