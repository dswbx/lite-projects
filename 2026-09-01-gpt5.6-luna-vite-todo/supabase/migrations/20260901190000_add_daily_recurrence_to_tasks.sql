alter table public.tasks add column recurrence text not null default 'none' check (recurrence in ('none', 'daily'));
alter table public.tasks add column series_id uuid;
create index tasks_series_due_idx on public.tasks(user_id, series_id, due_date);
