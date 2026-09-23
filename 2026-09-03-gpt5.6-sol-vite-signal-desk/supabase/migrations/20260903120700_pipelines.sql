create table public.pipelines (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);

create table public.pipeline_stages (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  pipeline_id text not null references public.pipelines(id) on delete cascade,
  name text not null check (name <> ''),
  position integer not null check (position >= 0),
  probability integer not null default 0 check (probability >= 0 and probability <= 100),
  stage_type text not null default 'open' check (stage_type in ('open', 'won', 'lost')),
  created_by uuid not null references auth.users(id),
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (pipeline_id, position),
  unique (pipeline_id, name),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);
