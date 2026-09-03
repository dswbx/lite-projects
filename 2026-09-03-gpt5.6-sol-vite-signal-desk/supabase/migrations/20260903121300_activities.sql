create table public.activities (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('call', 'email', 'meeting', 'note', 'demo', 'stage_change')),
  subject text not null check (subject <> ''),
  description text,
  occurred_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  outcome text,
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

create table public.activity_participants (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  activity_id text not null references public.activities(id) on delete cascade,
  contact_id text references public.contacts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  response_status text not null default 'none' check (response_status in ('none', 'accepted', 'declined', 'tentative')),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  check (contact_id is not null or user_id is not null),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
