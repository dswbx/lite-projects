create table public.campaigns (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null check (name <> ''),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  channel text not null check (channel in ('email', 'event', 'webinar', 'social', 'partner')),
  start_date date,
  end_date date,
  budget numeric(12,2) not null default 0 check (budget >= 0),
  actual_cost numeric(12,2) not null default 0 check (actual_cost >= 0),
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);

create table public.campaign_members (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  contact_id text references public.contacts(id) on delete cascade,
  lead_id text references public.leads(id) on delete cascade,
  status text not null default 'planned' check (status in ('planned', 'sent', 'responded', 'converted', 'unsubscribed')),
  responded_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_id is not null or lead_id is not null),
  unique (campaign_id, contact_id, lead_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
