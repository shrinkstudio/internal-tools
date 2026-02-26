import { createClient } from "@supabase/supabase-js";

// Simple server client using anon key — no cookie/auth dependency
// TODO: Restore cookie-based SSR client when auth is re-enabled
export async function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
