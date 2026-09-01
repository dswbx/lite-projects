import { createClient } from "@supabase/supabase-js";

export type Recurrence = "none" | "daily";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? window.location.origin;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "local-dev-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Task = {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  due_date: string | null;
  recurrence: Recurrence;
  series_id: string | null;
};
