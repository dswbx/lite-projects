create table habits (
  id serial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamp default current_timestamp,
  constraint habits_id_owner unique (id, user_id)
);

alter table habits enable row level security;

create policy habits_select_own on habits
  for select
  to authenticated
  using (user_id = auth.uid());

create policy habits_insert_own on habits
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy habits_update_own on habits
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy habits_delete_own on habits
  for delete
  to authenticated
  using (user_id = auth.uid());

create table habit_completions (
  id serial primary key,
  habit_id integer not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_on date not null,
  foreign key (habit_id, user_id) references habits (id, user_id) on delete cascade,
  unique (habit_id, completed_on)
);

alter table habit_completions enable row level security;

create policy habit_completions_select on habit_completions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy habit_completions_insert on habit_completions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy habit_completions_delete on habit_completions
  for delete
  to authenticated
  using (user_id = auth.uid());
