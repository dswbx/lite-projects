create table movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  watched boolean not null default false,
  rating smallint check (rating is null or (rating >= 1 and rating <= 5)),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table movies enable row level security;

create policy "movies select own" on movies for select using (auth.uid() = user_id);
create policy "movies insert own" on movies for insert with check (auth.uid() = user_id);
create policy "movies update own" on movies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "movies delete own" on movies for delete using (auth.uid() = user_id);

create or replace function set_movies_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger movies_updated_at
before update on movies
for each row execute function set_movies_updated_at();
