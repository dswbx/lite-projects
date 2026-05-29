import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  window.location.origin,
  "any-string-works-for-now",
);
