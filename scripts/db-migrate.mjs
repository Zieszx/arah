#!/usr/bin/env node
// Applies a SQL migration file to the Supabase Postgres database.
//
// Usage:
//   node --env-file=.env.development.local scripts/db-migrate.mjs supabase/migrations/0001_init.sql
//
// Reads POSTGRES_URL_NON_POOLING from the environment (DDL statements should
// not run over the pooled connection). The target SQL file is expected to be
// safely re-runnable (e.g. `create table if not exists`, `drop policy if
// exists` before `create policy`, `create or replace view`).

import { readFile } from "node:fs/promises";
import { Client } from "pg";

async function main() {
  const sqlPath = process.argv[2];
  if (!sqlPath) {
    console.error("Usage: node scripts/db-migrate.mjs <path-to-sql-file>");
    process.exit(1);
  }

  let connectionString = process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionString) {
    console.error("POSTGRES_URL_NON_POOLING is not set in the environment.");
    process.exit(1);
  }

  // Strip any sslmode query param: it takes precedence over the explicit
  // `ssl` option below and otherwise forces strict certificate verification.
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  connectionString = url.toString();

  const sql = await readFile(sqlPath, "utf8");

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log(`Applied ${sqlPath} successfully.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
