create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz default now()
);

alter table contacts enable row level security;

create policy contacts_select_own on contacts
  for select
  to authenticated
  using (user_id = auth.uid());

create policy contacts_insert_own on contacts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy contacts_update_own on contacts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy contacts_delete_own on contacts
  for delete
  to authenticated
  using (user_id = auth.uid());
