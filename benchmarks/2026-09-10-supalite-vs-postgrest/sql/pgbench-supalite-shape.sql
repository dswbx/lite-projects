begin;
select set_config('role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('storage.operation', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE "anon";
select "id" from "posts" limit 1;
commit;
