import { createClient } from "@supabase/supabase-js";

const fallbackUrl = typeof window === "undefined" ? "http://localhost:5173" : window.location.origin;

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? fallbackUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "local-dev-key",
);
