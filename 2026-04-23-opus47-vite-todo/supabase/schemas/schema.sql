create table todos (
   id serial primary key,
   user_id uuid references auth.users(id) on delete cascade,
   title text not null,
   is_public boolean default false,
   completed boolean default false,
   created_at timestamp default current_timestamp
);

alter table todos enable row level security;

-- anyone (anon + authed) can read public todos
create policy todos_select_public on todos
   for select
   using (is_public = true);

-- authenticated users can read their own todos (public or private)
create policy todos_select_own on todos
   for select
   to authenticated
   using (user_id = auth.uid());

-- authenticated users can insert their own todos
create policy todos_insert_own on todos
   for insert
   to authenticated
   with check (user_id = auth.uid());

-- authenticated users can update their own todos
create policy todos_update_own on todos
   for update
   to authenticated
   using (user_id = auth.uid())
   with check (user_id = auth.uid());

-- authenticated users can delete their own todos
create policy todos_delete_own on todos
   for delete
   to authenticated
   using (user_id = auth.uid());
