-- Deterministic seed. Run once against the bench database.
set client_min_messages = warning;

truncate table public.post_tags, public.comments, public.posts,
               public.tags, public.authors, public.events, public.notes
   restart identity cascade;

select setseed(0.42);

insert into public.authors (name, email)
select 'Author ' || g, 'author' || g || '@example.com'
from generate_series(1, 2000) g;

insert into public.posts (author_id, title, body, published, views, rating, created_at)
select (g % 2000) + 1,
       'Post ' || g || ' ' || (array['postgres','sqlite','supabase','realtime','storage','auth',
                                     'edge','vector','replication','benchmark'])[(g % 10) + 1]
                    || ' ' || (array['guide','deep dive','notes','changelog','tutorial'])[(g % 5) + 1],
       repeat('lorem ipsum dolor sit amet consectetur adipiscing elit ', 4) || 'body of post ' || g,
       (g % 4) <> 0,
       (g * 7919) % 10000,
       round(((g % 500) / 100.0)::numeric, 2),
       timestamptz '2024-01-01 00:00:00+00' + (g || ' minutes')::interval
from generate_series(1, 100000) g;

insert into public.tags (name)
select 'tag-' || g from generate_series(1, 25) g;

insert into public.post_tags (post_id, tag_id)
select p, t
from generate_series(1, 100000) p,
     lateral (select unnest(array[(p % 25) + 1, ((p * 3) % 25) + 1, ((p * 7) % 25) + 1]) as t) s
group by p, t;

insert into public.comments (post_id, author_id, body, created_at)
select (g % 100000) + 1,
       (g % 2000) + 1,
       'comment ' || g || ' ' || repeat('some feedback text here ', 3),
       timestamptz '2024-01-01 00:00:00+00' + (g || ' seconds')::interval
from generate_series(1, 400000) g;

insert into public.notes (owner_id, is_public, body)
select (g % 2000) + 1, (g % 2) = 0, 'note body ' || g
from generate_series(1, 50000) g;

analyze;
