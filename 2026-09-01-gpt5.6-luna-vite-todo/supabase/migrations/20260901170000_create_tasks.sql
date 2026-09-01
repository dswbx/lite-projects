create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (title <> ''),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks"
  on public.tasks for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own tasks"
  on public.tasks for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.tasks for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete to authenticated
  using (auth.uid() = user_id);
