create table public.tasks (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  title text not null check (title <> ''),
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  completed_at timestamptz,
  account_id text references public.accounts(id) on delete set null,
  contact_id text references public.contacts(id) on delete set null,
  opportunity_id text references public.opportunities(id) on delete set null,
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);

create table public.task_assignees (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  task_id text not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (task_id, user_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
