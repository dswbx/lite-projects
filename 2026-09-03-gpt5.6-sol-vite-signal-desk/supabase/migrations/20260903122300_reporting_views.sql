create schema if not exists private;

create view private.dashboard_workspace_summary as
select
  w.id as workspace_id,
  w.name as workspace_name,
  (select count(*) from public.accounts a where a.workspace_id = w.id and coalesce(a.archived_at, '') = '') as account_count,
  (select count(*) from public.contacts c where c.workspace_id = w.id and coalesce(c.archived_at, '') = '') as contact_count,
  (select count(*) from public.leads l where l.workspace_id = w.id and coalesce(l.archived_at, '') = '' and l.status <> 'converted') as active_lead_count,
  (select count(*) from public.opportunities o where o.workspace_id = w.id and coalesce(o.archived_at, '') = '' and o.status = 'open') as open_opportunity_count,
  (select coalesce(sum(o.value), 0) from public.opportunities o where o.workspace_id = w.id and coalesce(o.archived_at, '') = '' and o.status = 'open') as open_pipeline_value,
  (select count(*) from public.tasks t where t.workspace_id = w.id and coalesce(t.archived_at, '') = '' and t.status in ('open', 'in_progress')) as open_task_count
from public.workspaces w
where coalesce(w.archived_at, '') = '';

create view private.pipeline_stage_summary as
select
  o.workspace_id,
  o.pipeline_id,
  o.stage_id,
  s.name as stage_name,
  s.position as stage_position,
  count(o.id) as opportunity_count,
  coalesce(sum(o.value), 0) as total_value,
  coalesce(sum(o.value * o.probability / 100.0), 0) as weighted_value
from public.opportunities o
join public.pipeline_stages s on s.id = o.stage_id
where coalesce(o.archived_at, '') = '' and o.status = 'open'
group by o.workspace_id, o.pipeline_id, o.stage_id, s.name, s.position;

create view private.deal_signals as
select
  o.id,
  o.workspace_id,
  o.name,
  o.account_id,
  o.pipeline_id,
  o.stage_id,
  o.value,
  o.probability,
  o.expected_close_date,
  o.stage_entered_at,
  o.owner_id,
  (select max(a.occurred_at) from public.activities a where a.opportunity_id = o.id and coalesce(a.archived_at, '') = '') as last_activity_at,
  (select count(*) from public.tasks t where t.opportunity_id = o.id and coalesce(t.archived_at, '') = '' and t.status in ('open', 'in_progress')) as open_task_count,
  (select count(*) from public.tasks t where t.opportunity_id = o.id and coalesce(t.archived_at, '') = '' and t.status in ('open', 'in_progress') and t.due_at < now()) as overdue_task_count
from public.opportunities o
where coalesce(o.archived_at, '') = '' and o.status = 'open';
