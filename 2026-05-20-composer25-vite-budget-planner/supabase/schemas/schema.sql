-- monthly budget planner schema

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  budget_year int not null,
  budget_month int not null check (budget_month between 1 and 12),
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, budget_year, budget_month)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index expenses_user_date_idx on public.expenses (user_id, expense_date);
create index monthly_budgets_user_period_idx on public.monthly_budgets (user_id, budget_year, budget_month);

alter table public.categories enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.expenses enable row level security;

create policy "categories_select_own"
  on public.categories for select to authenticated
  using (user_id = auth.uid());

create policy "categories_insert_own"
  on public.categories for insert to authenticated
  with check (user_id = auth.uid());

create policy "categories_update_own"
  on public.categories for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "categories_delete_own"
  on public.categories for delete to authenticated
  using (user_id = auth.uid());

create policy "monthly_budgets_select_own"
  on public.monthly_budgets for select to authenticated
  using (user_id = auth.uid());

create policy "monthly_budgets_insert_own"
  on public.monthly_budgets for insert to authenticated
  with check (user_id = auth.uid());

create policy "monthly_budgets_update_own"
  on public.monthly_budgets for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "monthly_budgets_delete_own"
  on public.monthly_budgets for delete to authenticated
  using (user_id = auth.uid());

create policy "expenses_select_own"
  on public.expenses for select to authenticated
  using (user_id = auth.uid());

create policy "expenses_insert_own"
  on public.expenses for insert to authenticated
  with check (user_id = auth.uid());

create policy "expenses_update_own"
  on public.expenses for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "expenses_delete_own"
  on public.expenses for delete to authenticated
  using (user_id = auth.uid());
