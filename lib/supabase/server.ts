import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

export function createServerSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
