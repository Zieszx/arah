// Supabase client for the browser (Client Components).
//
// Uses createBrowserClient from @supabase/ssr rather than the plain
// @supabase/supabase-js client so that the session is persisted in cookies
// (not localStorage) -- the same cookies that lib/supabase/server.js and
// lib/supabase/middleware.js read on the server. Sharing one cookie-backed
// session across all three contexts is the whole point of @supabase/ssr; a
// localStorage-based client would be invisible to the server and middleware.
//
// Create a new client per call site (do not module-scope a singleton) --
// this matches the pattern used by lib/supabase/server.js and keeps all
// three client files symmetrical.
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
