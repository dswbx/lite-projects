create table public.custom_field_definitions (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  entity_type text not null check (entity_type in ('account', 'contact', 'lead', 'opportunity', 'task', 'quote', 'campaign')),
  data_type text not null check (data_type in ('text', 'number', 'date', 'boolean', 'select')),
  is_required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  position integer not null default 0 check (position >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by_role text not null default 'owner' check (created_by_role in ('owner', 'admin', 'manager', 'member')),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  unique (workspace_id, entity_type, name),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_role, created_by_status) references public.workspace_members(workspace_id, user_id, role, status) on update cascade
);

create table public.custom_field_values (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  definition_id text not null references public.custom_field_definitions(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  value jsonb not null,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (definition_id, entity_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
