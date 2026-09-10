-- Run after `lite migration up`.
--
-- The migration itself grants the request roles (anon/authenticated/service_role)
-- what they need. These two extra grants exist for a supalite-specific reason:
-- supalite's schema-cache introspection only sees relations the *connecting*
-- role holds privileges on, and `authenticator` is NOINHERIT, so it inherits
-- nothing from `anon`. Without them supalite answers
-- `PGRST205 Could not find the table 'public.posts' in the schema cache` while
-- PostgREST, which introspects pg_catalog directly, works fine.
-- They do not change the runtime privilege path: every request still executes
-- as `anon` after SET LOCAL ROLE.
grant select, insert, update, delete on all tables in schema public to authenticator;
grant usage, select on all sequences in schema public to authenticator;
grant execute on function public.post_stats(integer) to authenticator;
grant execute on function public.whoami() to authenticator;

-- supalite reads its applied-migration history at startup; authenticator needs
-- to see it or the schema cache comes up empty for the same reason as above.
grant usage on schema supabase_migrations to authenticator, anon;
grant select on all tables in schema supabase_migrations to authenticator, anon;
