import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(window.location.origin, "any-string-works-for-now");

export type Todo = {
   id: number;
   user_id: string | null;
   title: string;
   is_public: boolean;
   completed: boolean;
   created_at: string;
};
