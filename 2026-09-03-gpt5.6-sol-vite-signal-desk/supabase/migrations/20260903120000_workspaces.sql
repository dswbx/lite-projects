create table public.workspaces (
  id text primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  slug text not null unique check (slug <> ''),
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'growth', 'enterprise')),
  timezone text not null default 'UTC',
  currency text not null default 'USD',
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, owner_id)
);
