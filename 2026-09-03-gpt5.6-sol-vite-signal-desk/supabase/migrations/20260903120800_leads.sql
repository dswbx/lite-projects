create table public.leads (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  first_name text not null check (first_name <> ''),
  last_name text not null check (last_name <> ''),
  company text not null check (company <> ''),
  email text,
  phone text,
  status text not null default 'new' check (status in ('new', 'working', 'qualified', 'converted', 'disqualified')),
  source text not null default 'inbound',
  score integer not null default 0 check (score >= 0 and score <= 100),
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);

create table public.lead_conversions (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  lead_id text not null references public.leads(id) on delete cascade,
  account_id text references public.accounts(id) on delete set null,
  contact_id text references public.contacts(id) on delete set null,
  opportunity_id text,
  state text not null default 'started' check (state in ('started', 'completed', 'compensated')),
  error_message text,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
