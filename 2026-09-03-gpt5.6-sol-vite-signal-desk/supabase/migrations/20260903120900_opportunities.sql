create table public.opportunities (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  account_id text references public.accounts(id) on delete set null,
  pipeline_id text not null references public.pipelines(id),
  stage_id text not null references public.pipeline_stages(id),
  name text not null check (name <> ''),
  value numeric(14,2) not null default 0 check (value >= 0),
  probability integer not null default 0 check (probability >= 0 and probability <= 100),
  expected_close_date date,
  stage_entered_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'won', 'lost')),
  loss_reason text,
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);

create table public.opportunity_contacts (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  contact_id text not null references public.contacts(id) on delete cascade,
  role text not null default 'influencer',
  is_primary boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (opportunity_id, contact_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);

create table public.opportunity_tags (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  tag_id text not null references public.tags(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  unique (opportunity_id, tag_id),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
