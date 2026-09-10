-- Roles and database for the benchmark.
-- `authenticator` mirrors the Supabase/PostgREST convention: LOGIN + NOINHERIT,
-- member of the request roles but holding none of their privileges implicitly.
-- Both servers under test connect as this role and both SET LOCAL ROLE per request.
drop database if exists bench;
drop role if exists authenticator;
drop role if exists bench_app;
drop role if exists anon;
drop role if exists authenticated;
drop role if exists service_role;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password 'benchpass';
create role bench_app login password 'benchpass' createrole;

grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to bench_app;

create database bench owner bench_app;

\connect bench
create schema if not exists monitor;
create extension if not exists pg_stat_statements schema monitor;
alter schema public owner to bench_app;
grant all on schema public to bench_app;
