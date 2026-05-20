CREATE TABLE public.categories (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, name text NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

CREATE POLICY categories_delete_own ON public.categories FOR DELETE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY categories_insert_own ON public.categories FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY categories_select_own ON public.categories FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY categories_update_own ON public.categories FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE TABLE public.expenses (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, category_id uuid NOT NULL, amount numeric(12,2) NOT NULL, note text, expense_date date DEFAULT CURRENT_DATE NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_check CHECK (amount > 0::numeric);

ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);

CREATE INDEX expenses_user_date_idx ON expenses (user_id, expense_date);

CREATE POLICY expenses_delete_own ON public.expenses FOR DELETE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY expenses_insert_own ON public.expenses FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY expenses_select_own ON public.expenses FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY expenses_update_own ON public.expenses FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

CREATE TABLE public.monthly_budgets (id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, category_id uuid NOT NULL, budget_year integer NOT NULL, budget_month integer NOT NULL, amount numeric(12,2) NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.monthly_budgets ADD CONSTRAINT monthly_budgets_amount_check CHECK (amount >= 0::numeric);

ALTER TABLE public.monthly_budgets ADD CONSTRAINT monthly_budgets_budget_month_check CHECK (budget_month >= 1 AND budget_month <= 12);

ALTER TABLE public.monthly_budgets ADD CONSTRAINT monthly_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

ALTER TABLE public.monthly_budgets ADD CONSTRAINT monthly_budgets_pkey PRIMARY KEY (id);

ALTER TABLE public.monthly_budgets ADD CONSTRAINT monthly_budgets_user_id_category_id_budget_year_budget_mont_key UNIQUE (user_id, category_id, budget_year, budget_month);

CREATE INDEX monthly_budgets_user_period_idx ON monthly_budgets (user_id, budget_year, budget_month);

CREATE POLICY monthly_budgets_delete_own ON public.monthly_budgets FOR DELETE TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY monthly_budgets_insert_own ON public.monthly_budgets FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));

CREATE POLICY monthly_budgets_select_own ON public.monthly_budgets FOR SELECT TO authenticated USING ((user_id = auth.uid()));

CREATE POLICY monthly_budgets_update_own ON public.monthly_budgets FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
