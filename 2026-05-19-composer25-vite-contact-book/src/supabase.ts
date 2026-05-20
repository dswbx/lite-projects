import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
   import.meta.env.VITE_SUPABASE_URL ?? window.location.origin,
   import.meta.env.VITE_SUPABASE_ANON_KEY ?? "any-string-works-for-now",
);

export type Contact = {
   id: number;
   user_id: string;
   name: string;
   email: string | null;
   phone: string | null;
   company: string | null;
   notes: string | null;
   created_at: string;
   updated_at: string;
};

export type ContactInput = {
   name: string;
   email: string;
   phone: string;
   company: string;
   notes: string;
};
