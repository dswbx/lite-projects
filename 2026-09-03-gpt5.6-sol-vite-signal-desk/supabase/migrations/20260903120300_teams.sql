create table public.teams (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  description text,
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, name),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);

create table public.team_memberships (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_lead boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (team_id, user_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);
