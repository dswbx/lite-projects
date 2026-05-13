-- initial schema: folders + bookmarks, scoped per user via RLS

create table folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index folders_user_id_idx on folders(user_id);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  title text not null,
  url text not null,
  description text,
  created_at timestamptz not null default now()
);

create index bookmarks_user_id_idx on bookmarks(user_id);
create index bookmarks_folder_id_idx on bookmarks(folder_id);

alter table folders enable row level security;
alter table bookmarks enable row level security;

create policy "folders are visible to owner" on folders
  for select to authenticated using (auth.uid() = user_id);

create policy "folders can be inserted by owner" on folders
  for insert to authenticated with check (auth.uid() = user_id);

create policy "folders can be updated by owner" on folders
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "folders can be deleted by owner" on folders
  for delete to authenticated using (auth.uid() = user_id);

create policy "bookmarks are visible to owner" on bookmarks
  for select to authenticated using (auth.uid() = user_id);

create policy "bookmarks can be inserted by owner" on bookmarks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "bookmarks can be updated by owner" on bookmarks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bookmarks can be deleted by owner" on bookmarks
  for delete to authenticated using (auth.uid() = user_id);
