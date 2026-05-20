create type book_status as enum ('want_to_read', 'reading', 'finished');

create table books (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null,
  status book_status not null default 'want_to_read',
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  review text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

alter table books enable row level security;

create policy books_select_own on books
  for select
  to authenticated
  using (user_id = auth.uid());

create policy books_insert_own on books
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy books_update_own on books
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy books_delete_own on books
  for delete
  to authenticated
  using (user_id = auth.uid());
