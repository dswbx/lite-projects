create table public.file_assets (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  file_name text not null check (file_name <> ''),
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'text/plain')),
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 10485760),
  storage_bucket text not null default 'crm-files',
  storage_path text not null check (storage_path <> ''),
  checksum text,
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (storage_bucket, storage_path),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);

create table public.file_links (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  file_asset_id text not null references public.file_assets(id) on delete cascade,
  entity_type text not null check (entity_type in ('account', 'contact', 'lead', 'opportunity', 'task', 'quote', 'campaign')),
  entity_id text not null,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (file_asset_id, entity_type, entity_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
