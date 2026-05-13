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
