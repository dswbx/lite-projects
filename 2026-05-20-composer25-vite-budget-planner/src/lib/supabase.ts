import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? window.location.origin;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "dev-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Category = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type MonthlyBudget = {
  id: string;
  user_id: string;
  category_id: string;
  budget_year: number;
  budget_month: number;
  amount: number;
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  note: string | null;
  expense_date: string;
  created_at: string;
  categories?: { name: string } | null;
};
