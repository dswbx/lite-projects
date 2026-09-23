create index accounts_workspace_owner_idx on public.accounts (workspace_id, owner_id, archived_at);
create index accounts_workspace_stage_idx on public.accounts (workspace_id, lifecycle_stage, archived_at);
create index contacts_workspace_account_idx on public.contacts (workspace_id, account_id, archived_at);
create index contacts_workspace_owner_idx on public.contacts (workspace_id, owner_id, archived_at);
create index leads_workspace_status_score_idx on public.leads (workspace_id, status, score);
create index leads_workspace_owner_idx on public.leads (workspace_id, owner_id, archived_at);
create index stages_pipeline_position_idx on public.pipeline_stages (pipeline_id, position);
create index opportunities_workspace_stage_idx on public.opportunities (workspace_id, stage_id, archived_at);
create index opportunities_workspace_owner_idx on public.opportunities (workspace_id, owner_id, status);
create index opportunities_close_date_idx on public.opportunities (workspace_id, expected_close_date);
create index quotes_workspace_status_idx on public.quotes (workspace_id, status, expires_at);
create index quote_lines_quote_position_idx on public.quote_lines (quote_id, position);
create index activities_workspace_time_idx on public.activities (workspace_id, occurred_at);
create index activities_opportunity_time_idx on public.activities (opportunity_id, occurred_at);
create index tasks_workspace_due_idx on public.tasks (workspace_id, status, due_at);
create index tasks_owner_due_idx on public.tasks (owner_id, status, due_at);
create index notes_entity_idx on public.notes (workspace_id, entity_type, entity_id);
create index file_links_entity_idx on public.file_links (workspace_id, entity_type, entity_id);
create index email_messages_thread_time_idx on public.email_messages (thread_id, sent_at);
create index campaign_members_campaign_status_idx on public.campaign_members (campaign_id, status);
create index custom_values_entity_idx on public.custom_field_values (workspace_id, entity_type, entity_id);
create index notifications_user_unread_idx on public.notifications (user_id, read_at, created_at);
create index audit_events_entity_time_idx on public.audit_events (workspace_id, entity_type, entity_id, created_at);
create unique index one_default_pipeline_per_workspace_idx on public.pipelines (workspace_id) where is_default = true;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_workspace_members_updated_at before update on public.workspace_members for each row execute function public.set_updated_at();
create trigger set_teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger set_accounts_updated_at before update on public.accounts for each row execute function public.set_updated_at();
create trigger set_contacts_updated_at before update on public.contacts for each row execute function public.set_updated_at();
create trigger set_pipelines_updated_at before update on public.pipelines for each row execute function public.set_updated_at();
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger set_lead_conversions_updated_at before update on public.lead_conversions for each row execute function public.set_updated_at();
create trigger set_opportunities_updated_at before update on public.opportunities for each row execute function public.set_updated_at();
create trigger set_products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger set_price_books_updated_at before update on public.price_books for each row execute function public.set_updated_at();
create trigger set_price_book_items_updated_at before update on public.price_book_items for each row execute function public.set_updated_at();
create trigger set_quotes_updated_at before update on public.quotes for each row execute function public.set_updated_at();
create trigger set_quote_lines_updated_at before update on public.quote_lines for each row execute function public.set_updated_at();
create trigger set_activities_updated_at before update on public.activities for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger set_notes_updated_at before update on public.notes for each row execute function public.set_updated_at();
create trigger set_file_assets_updated_at before update on public.file_assets for each row execute function public.set_updated_at();
create trigger set_email_threads_updated_at before update on public.email_threads for each row execute function public.set_updated_at();
create trigger set_email_messages_updated_at before update on public.email_messages for each row execute function public.set_updated_at();
create trigger set_campaigns_updated_at before update on public.campaigns for each row execute function public.set_updated_at();
create trigger set_campaign_members_updated_at before update on public.campaign_members for each row execute function public.set_updated_at();
create trigger set_custom_field_definitions_updated_at before update on public.custom_field_definitions for each row execute function public.set_updated_at();
create trigger set_custom_field_values_updated_at before update on public.custom_field_values for each row execute function public.set_updated_at();
create trigger set_saved_views_updated_at before update on public.saved_views for each row execute function public.set_updated_at();
create trigger set_notifications_updated_at before update on public.notifications for each row execute function public.set_updated_at();

-- Auth seed stays in PostgreSQL-dialect migration history because Supalite's
-- SQLite seed runner does not translate schema-qualified auth tables. These
-- rows use the same auth.users/auth.identities shape exported by lite upgrade.
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('10000000-0000-4000-8000-000000000001','authenticated','authenticated','alex@signaldesk.local','$2b$10$IOJI9qwiBhwomfx95JA5U.hn9MGNmfDxg53wx2k0xo84OHBwE.MX2','2026-08-01T09:00:00Z','{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Alex Morgan"}'::jsonb,'2026-08-01T09:00:00Z','2026-08-01T09:00:00Z'),
('10000000-0000-4000-8000-000000000002','authenticated','authenticated','sam@signaldesk.local','$2b$10$IOJI9qwiBhwomfx95JA5U.hn9MGNmfDxg53wx2k0xo84OHBwE.MX2','2026-08-01T09:00:00Z','{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Sam Rivera"}'::jsonb,'2026-08-01T09:00:00Z','2026-08-01T09:00:00Z'),
('10000000-0000-4000-8000-000000000003','authenticated','authenticated','jamie@signaldesk.local','$2b$10$IOJI9qwiBhwomfx95JA5U.hn9MGNmfDxg53wx2k0xo84OHBwE.MX2','2026-08-01T09:00:00Z','{"provider":"email","providers":["email"]}'::jsonb,'{"full_name":"Jamie Chen"}'::jsonb,'2026-08-01T09:00:00Z','2026-08-01T09:00:00Z') on conflict do nothing;

insert into auth.identities (id,provider,provider_id,user_id,identity_data,last_sign_in_at,created_at,updated_at) values
('20000000-0000-4000-8000-000000000001','email','alex@signaldesk.local','10000000-0000-4000-8000-000000000001','{"sub":"10000000-0000-4000-8000-000000000001","email":"alex@signaldesk.local","email_verified":true}'::jsonb,'2026-09-02T10:00:00Z','2026-08-01T09:00:00Z','2026-09-02T10:00:00Z'),
('20000000-0000-4000-8000-000000000002','email','sam@signaldesk.local','10000000-0000-4000-8000-000000000002','{"sub":"10000000-0000-4000-8000-000000000002","email":"sam@signaldesk.local","email_verified":true}'::jsonb,'2026-09-02T10:00:00Z','2026-08-01T09:00:00Z','2026-09-02T10:00:00Z'),
('20000000-0000-4000-8000-000000000003','email','jamie@signaldesk.local','10000000-0000-4000-8000-000000000003','{"sub":"10000000-0000-4000-8000-000000000003","email":"jamie@signaldesk.local","email_verified":true}'::jsonb,'2026-09-02T10:00:00Z','2026-08-01T09:00:00Z','2026-09-02T10:00:00Z') on conflict do nothing;
