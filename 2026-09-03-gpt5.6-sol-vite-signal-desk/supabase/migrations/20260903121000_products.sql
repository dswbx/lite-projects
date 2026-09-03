create table public.products (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  sku text not null check (sku <> ''),
  description text,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  billing_period text not null default 'one_time' check (billing_period in ('one_time', 'monthly', 'annual')),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, sku),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);
