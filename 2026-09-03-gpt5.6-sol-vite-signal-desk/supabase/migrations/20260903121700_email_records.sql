create table public.email_threads (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  subject text not null check (subject <> ''),
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

create table public.email_messages (
  id text primary key default gen_random_uuid(),
  workspace_id text not null references public.workspaces(id) on delete cascade,
  thread_id text not null references public.email_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_email text not null,
  recipient_emails jsonb not null default '[]'::jsonb,
  body_text text not null,
  sent_at timestamptz,
  delivery_status text not null default 'recorded' check (delivery_status in ('recorded', 'sent', 'delivered', 'bounced')),
  owner_id uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_by_status text not null default 'active' check (created_by_status in ('invited', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, created_by) references public.workspace_members(workspace_id, user_id),
  foreign key (workspace_id, created_by, created_by_status) references public.workspace_members(workspace_id, user_id, status) on update cascade
);
