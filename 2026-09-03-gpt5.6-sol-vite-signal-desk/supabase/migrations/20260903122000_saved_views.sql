create table public.saved_views (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  entity_type text not null check (entity_type in ('account', 'contact', 'lead', 'opportunity', 'task', 'quote', 'campaign')),
  filters jsonb not null default '[]'::jsonb,
  sorts jsonb not null default '[]'::jsonb,
  visible_columns jsonb not null default '[]'::jsonb,
  is_shared boolean not null default false,
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
