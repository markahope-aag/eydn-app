import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, key);
}

/**
 * Cast a typed Supabase client to an untyped one for dynamic table queries.
 * Use this instead of `supabase as unknown as SupabaseClient` scattered across files.
 */
export function untypedClient(supabase: ReturnType<typeof createSupabaseAdmin>): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}
