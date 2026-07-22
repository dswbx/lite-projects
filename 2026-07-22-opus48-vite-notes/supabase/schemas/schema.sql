-- Notes: one row per note, owned by the user who created it.
-- No DEFAULT auth.uid() on SQLite path — client supplies user_id, RLS enforces ownership.
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_updated_at_idx
  on notes (user_id, updated_at desc);

alter table notes enable row level security;

create policy "select own notes" on notes
  for select using (auth.uid() = user_id);

create policy "insert own notes" on notes
  for insert with check (auth.uid() = user_id);

create policy "update own notes" on notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own notes" on notes
  for delete using (auth.uid() = user_id);
