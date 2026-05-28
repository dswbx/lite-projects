import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = window.location.origin;
const supabaseAnonKey = "local-dev-anon-key";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
