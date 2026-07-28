-- field_stats is read-only by design. Supabase's default public-schema grants
-- hand anon/authenticated full DML on anything created there. The writes are
-- already rejected (an aggregate view is not updatable), but least privilege
-- means granting only what is actually used.
revoke all on field_stats from anon, authenticated;
grant select on field_stats to anon, authenticated;
