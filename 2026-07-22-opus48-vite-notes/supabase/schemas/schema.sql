-- Notes: one row per note, owned by the user who created it.
-- No DEFAULT auth.uid() on SQLite path — client supplies user_id, RLS enforces ownership.
-- Tags live inline as a text[] array on the note (validated: `contains` filter works on the SQLite path).
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_updated_at_idx
  on notes (user_id, updated_at desc);

-- Sharing: one row per (note, recipient email). Recipient is stored by email so a note can be
-- shared before the recipient has signed up; auth normalises emails to lowercase.
create table if not exists note_shares (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  shared_with_email text not null,
  created_at timestamptz not null default now(),
  unique (note_id, shared_with_email)
);

create index if not exists note_shares_recipient_idx
  on note_shares (shared_with_email);

alter table notes enable row level security;

create policy "select own notes" on notes
  for select using (auth.uid() = user_id);

create policy "insert own notes" on notes
  for insert with check (auth.uid() = user_id);

create policy "update own notes" on notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "delete own notes" on notes
  for delete using (auth.uid() = user_id);

-- Recipients of a share can READ (not edit/delete) the shared note.
-- The subquery lives in USING (merged into WHERE = real SQL, supported), NOT in an
-- INSERT WITH CHECK (subqueries there are unsupported on SQLite).
-- `s.owner_id = notes.user_id` is the security seal: a share only grants access when the
-- person who created it is the note's actual owner, so a user cannot fabricate a share for
-- someone else's note to read it (they can only insert shares with owner_id = their own uid).
-- NOTE: do not alias note_shares here. On the SQLite path an aliased subquery
-- (`from note_shares s ... s.note_id`) emits SQL that keeps the `s.` qualifier but drops the
-- alias in FROM, so the statement fails to prepare. Using the full table name works.
create policy "read notes shared with me" on notes
  for select using (
    exists (
      select 1 from note_shares
      where note_shares.note_id = notes.id
        and note_shares.owner_id = notes.user_id
        and note_shares.shared_with_email = (auth.jwt() ->> 'email')
    )
  );

alter table note_shares enable row level security;

-- Owner manages shares for their own notes. owner_id must be the caller (no subquery needed).
create policy "manage own shares" on note_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Recipient can list shares addressed to them (to show "shared with me").
create policy "read shares addressed to me" on note_shares
  for select using (shared_with_email = (auth.jwt() ->> 'email'));
