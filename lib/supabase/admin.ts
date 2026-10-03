import "server-only";
import { createClient } from "@supabase/supabase-js";

// Supabase client with the SECRET key. It bypasses Row Level Security, so it
// is only for trusted server work that users must not do themselves (like
// writing to the shared movies cache). Never use it for user data: use
// lib/supabase/server.ts so RLS applies.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Add it to .env.local and restart the dev server.",
    );
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    // A server-side key, not a user session: nothing to store or refresh.
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
