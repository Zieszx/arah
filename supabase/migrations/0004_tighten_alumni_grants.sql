-- Defence in depth: RLS already denies anon, but a future accidentally-permissive
-- policy shouldn't be catastrophic. The client never reads this table directly —
-- field_stats is the only sanctioned path.
revoke all on alumni_profiles from anon, authenticated;
