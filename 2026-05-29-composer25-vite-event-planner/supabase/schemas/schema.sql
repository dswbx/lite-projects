-- events owned per user
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  event_date timestamptz not null,
  location text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table events enable row level security;

create policy "events_select_own"
  on events
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "events_insert_own"
  on events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "events_update_own"
  on events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "events_delete_own"
  on events
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- guests belong to an event; user_id denormalized for sqlite insert rls
create table guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'yes', 'no')),
  created_at timestamptz not null default now()
);

alter table guests enable row level security;

create policy "guests_select_own"
  on guests
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "guests_insert_own"
  on guests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "guests_update_own"
  on guests
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "guests_delete_own"
  on guests
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function set_updated_at () returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_events_updated_at
before update on events
for each row
execute function set_updated_at ();
