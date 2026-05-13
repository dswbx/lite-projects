alter table bookmarks add column archived boolean not null default false;
create index bookmarks_archived_idx on bookmarks(archived);
