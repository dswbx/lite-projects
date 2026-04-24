import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(window.location.origin, "any-string-works-for-now");

export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};
