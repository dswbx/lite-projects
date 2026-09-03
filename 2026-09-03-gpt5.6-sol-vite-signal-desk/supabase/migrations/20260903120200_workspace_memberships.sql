create table public.workspace_members (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  workspace_owner_id uuid not null references auth.users(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'member')),
  status text not null default 'active' check (status in ('invited', 'active', 'suspended')),
  invited_email text,
  joined_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id),
  unique (workspace_id, user_id, status),
  unique (workspace_id, user_id, role, status),
  foreign key (workspace_id, workspace_owner_id) references public.workspaces(id, owner_id) on delete cascade
);
