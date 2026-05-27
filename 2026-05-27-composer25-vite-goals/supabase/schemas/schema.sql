-- goals and milestones with row-level security (per-user isolation)

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  target_date date,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals (user_id);
create index milestones_goal_id_idx on public.milestones (goal_id);
create index milestones_user_id_idx on public.milestones (user_id);

alter table public.goals enable row level security;
alter table public.milestones enable row level security;

create policy goals_select_own on public.goals
  for select to authenticated using (auth.uid() = user_id);

create policy goals_insert_own on public.goals
  for insert to authenticated with check (auth.uid() = user_id);

create policy goals_update_own on public.goals
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy goals_delete_own on public.goals
  for delete to authenticated using (auth.uid() = user_id);

create policy milestones_select_own on public.milestones
  for select to authenticated using (auth.uid() = user_id);

create policy milestones_insert_own on public.milestones
  for insert to authenticated with check (auth.uid() = user_id);

create policy milestones_update_own on public.milestones
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy milestones_delete_own on public.milestones
  for delete to authenticated using (auth.uid() = user_id);
