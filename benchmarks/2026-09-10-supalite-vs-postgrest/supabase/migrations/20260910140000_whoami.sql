-- Parity probe: lets the harness prove both servers execute requests under the
-- same Postgres role and the same RLS posture.
create function public.whoami()
returns table (session_user_name text, current_role_name text, jwt_role text)
language sql
stable
as $$
   select session_user::text,
          current_user::text,
          coalesce(current_setting('request.jwt.claim.role', true),
                   current_setting('request.jwt.claims', true), '')::text;
$$;

grant execute on function public.whoami() to anon, authenticated, service_role, authenticator;
