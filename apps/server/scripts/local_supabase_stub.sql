-- Minimal stand-ins for Supabase-managed objects so migrations and tests can run
-- against a plain local Postgres. Never run this against a Supabase project.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
