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
