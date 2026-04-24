create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table notes enable row level security;

create policy notes_select_own on notes
  for select
  to authenticated
  using (user_id = auth.uid());

create policy notes_insert_own on notes
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy notes_update_own on notes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notes_delete_own on notes
  for delete
  to authenticated
  using (user_id = auth.uid());
