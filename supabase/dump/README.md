# Database dump

A restorable copy of the database, so the system can be stood up from this
repository alone rather than depending on one live Supabase project.

Regenerate with `npm run export:db`.

| File | Contents |
| --- | --- |
| `schema.sql` | Structure only — tables, views, functions, triggers, policies |
| `data.sql` | The 207 `alumni_profiles` rows and the 5 `reference_statistics` rows, as `COPY` statements |

`reference_statistics` holds published Ministry of Higher Education figures.
They are world-readable in the live database for the same reason they are safe
to export: no row describes an individual. They are **context, never training
data** — see `docs/DATA-SOURCES.md`.

## What is NOT in here, and why

`auth.users`, `profiles`, `quiz_responses` and `predictions` are excluded.
Those are real people's accounts, their answers and their results.

A dump gets copied onto shared drives, attached to emails, and committed by
mistake. Personal data must not be the thing that travels that easily —
especially on a product whose privacy page tells students their answers are
visible only to them and an administrator.

`alumni_profiles` is different in kind: it is the consented survey, it carries
no names, no contact details and no identifiers, and it is already the
published dataset in `ml/data/survey.csv`. Verified before shipping — the dump
contains exactly one table and zero email addresses.

## The migrations are still the source of truth for the schema

`supabase/migrations/*.sql` define the structure and should be applied in
order to a fresh project. `schema.sql` here is a snapshot for reading, and for
diffing against the migrations if the two are ever suspected of having
drifted. **Restoring `schema.sql` instead of running the migrations is not the
supported path** — it would skip the migration history and leave no record of
which change introduced what.

## Restoring

```bash
# Structure, from the migrations (supported path)
psql "$POSTGRES_URL_NON_POOLING" -f supabase/migrations/0001_init.sql
# …and the rest, in filename order

# Then the alumni data
psql "$POSTGRES_URL_NON_POOLING" -f supabase/dump/data.sql
```

`npm run seed:alumni` does the same thing from `ml/data/survey.csv` and is
usually easier — the CSV and this dump hold the same 207 rows. The dump exists
so the database can be restored without needing the training pipeline, and so
a reviewer can see the real stored shape rather than inferring it.
