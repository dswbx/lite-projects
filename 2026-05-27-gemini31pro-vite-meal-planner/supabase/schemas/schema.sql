-- Meals table
create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  created_at timestamptz default now()
);

alter table meals enable row level security;
create policy "Users can manage their own meals" on meals
  for all to authenticated using (auth.uid() = user_id);

-- Meal ingredients table
create table meal_ingredients (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid references meals on delete cascade not null,
  name text not null,
  amount text
);

alter table meal_ingredients enable row level security;
create policy "Users can manage their own meal ingredients" on meal_ingredients
  for all to authenticated using (
    exists (
      select 1 from meals
      where meals.id = meal_ingredients.meal_id
      and meals.user_id = auth.uid()
    )
  );

-- Weekly plan table
create table weekly_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day_of_week text not null,
  meal_id uuid references meals on delete set null,
  unique(user_id, day_of_week)
);

alter table weekly_plan enable row level security;
create policy "Users can manage their own weekly plan" on weekly_plan
  for all to authenticated using (auth.uid() = user_id);
