import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? window.location.origin;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "local-anon-key";

export const supabase = createClient(url, key);

export type Folder = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type Bookmark = {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  url: string;
  description: string | null;
  created_at: string;
};
