-- Benchmark schema. Written as plain Postgres DDL and applied through
-- `lite migration up` so that supalite's runtime metadata and PostgREST's
-- introspection both see the exact same physical schema.

create table public.authors (
   id         serial primary key,
   name       text        not null,
   email      text        not null unique,
   created_at timestamptz not null default now()
);

create table public.posts (
   id         serial primary key,
   author_id  integer     not null references public.authors (id),
   title      text        not null,
   body       text        not null,
   published  boolean     not null default false,
   views      integer     not null default 0,
   rating     numeric(3, 2),
   created_at timestamptz not null default now()
);

create table public.comments (
   id         serial primary key,
   post_id    integer     not null references public.posts (id),
   author_id  integer     not null references public.authors (id),
   body       text        not null,
   created_at timestamptz not null default now()
);

create table public.tags (
   id   serial primary key,
   name text not null unique
);

create table public.post_tags (
   post_id integer not null references public.posts (id),
   tag_id  integer not null references public.tags (id),
   primary key (post_id, tag_id)
);

-- write target: append-only, no FKs, so INSERT cost is API-bound not index-bound
create table public.events (
   id         bigserial primary key,
   kind       text        not null,
   payload    jsonb       not null default '{}'::jsonb,
   created_at timestamptz not null default now()
);

-- RLS scenario target
create table public.notes (
   id        serial  primary key,
   owner_id  integer not null,
   is_public boolean not null default false,
   body      text    not null
);

create index posts_author_id_idx on public.posts (author_id);
create index posts_views_idx on public.posts (views desc);
create index posts_published_views_idx on public.posts (published, views desc);
create index comments_post_id_idx on public.comments (post_id);
create index post_tags_tag_id_idx on public.post_tags (tag_id);
create index posts_title_fts_idx on public.posts using gin (to_tsvector('english', title));
create index notes_owner_id_idx on public.notes (owner_id);

-- RPC scenario target
create function public.post_stats(p_author_id integer)
returns table (post_count bigint, total_views bigint, avg_rating numeric)
language sql
stable
as $$
   select count(*)::bigint, coalesce(sum(views), 0)::bigint, avg(rating)
   from public.posts
   where author_id = p_author_id;
$$;

alter table public.notes enable row level security;

create policy notes_public_read on public.notes
   for select
   using (is_public = true);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on function public.post_stats(integer) to anon, authenticated, service_role;
