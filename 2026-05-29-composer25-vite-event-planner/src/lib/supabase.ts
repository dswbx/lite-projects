import { createClient } from "@supabase/supabase-js";

// Default to the in-Vite supalite plugin (same-origin API, any non-empty key).
// When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set (e.g. after
// `lite upgrade`), the same app points at full Supabase instead — this is what
// lets one e2e suite run unchanged against both backends.
const url = import.meta.env.VITE_SUPABASE_URL ?? window.location.origin;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "any-string-works-for-now";

export const supabase = createClient(url, key);
