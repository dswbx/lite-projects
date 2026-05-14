create table journal_entries (
  id serial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  body text not null default '',
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  unique (user_id, entry_date)
);

alter table journal_entries enable row level security;

create policy journal_entries_select_own on journal_entries
  for select
  to authenticated
  using (user_id = auth.uid());

create policy journal_entries_insert_own on journal_entries
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy journal_entries_update_own on journal_entries
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy journal_entries_delete_own on journal_entries
  for delete
  to authenticated
  using (user_id = auth.uid());
