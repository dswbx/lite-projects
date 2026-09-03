import type {
  AccountRecord,
  ActivityRecord,
  AuditEventRecord,
  CampaignRecord,
  ContactRecord,
  CustomFieldDefinitionRecord,
  CustomFieldValueRecord,
  EmailMessageRecord,
  EmailThreadRecord,
  FileLinkRecord,
  FileRecord,
  Json,
  LeadConversionRecord,
  LeadRecord,
  MembershipRecord,
  NoteRecord,
  NotificationRecord,
  OpportunityRecord,
  PipelineRecord,
  PipelineStageRecord,
  PriceBookItemRecord,
  PriceBookRecord,
  ProductRecord,
  ProfileRecord,
  QuoteRecord,
  SavedViewRecord,
  TaskRecord,
  TeamRecord,
  WorkspaceRecord,
} from "./domain"

type Table<Row> = {
  Row: Row & Record<string, unknown>
  Insert: Partial<Row> & Record<string, unknown>
  Update: Partial<Row> & Record<string, unknown>
  Relationships: []
}

type JoinRecord = {
  id: string
  workspace_id: string
  created_by: string
  created_at: string
  [key: string]: Json | undefined
}

type TagRecord = {
  id: string
  workspace_id: string
  created_by: string
  name: string
  color: string
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      workspaces: Table<WorkspaceRecord>
      profiles: Table<ProfileRecord>
      workspace_members: Table<MembershipRecord>
      teams: Table<TeamRecord>
      team_memberships: Table<JoinRecord>
      accounts: Table<AccountRecord>
      contacts: Table<ContactRecord>
      tags: Table<TagRecord>
      account_tags: Table<JoinRecord>
      contact_tags: Table<JoinRecord>
      pipelines: Table<PipelineRecord>
      pipeline_stages: Table<PipelineStageRecord>
      leads: Table<LeadRecord>
      lead_conversions: Table<LeadConversionRecord>
      opportunities: Table<OpportunityRecord>
      opportunity_contacts: Table<JoinRecord>
      opportunity_tags: Table<JoinRecord>
      products: Table<ProductRecord>
      price_books: Table<PriceBookRecord>
      price_book_items: Table<PriceBookItemRecord>
      quotes: Table<QuoteRecord>
      quote_lines: Table<JoinRecord>
      activities: Table<ActivityRecord>
      activity_participants: Table<JoinRecord>
      tasks: Table<TaskRecord>
      task_assignees: Table<JoinRecord>
      notes: Table<NoteRecord>
      file_assets: Table<FileRecord>
      file_links: Table<FileLinkRecord>
      email_threads: Table<EmailThreadRecord>
      email_messages: Table<EmailMessageRecord>
      campaigns: Table<CampaignRecord>
      campaign_members: Table<JoinRecord>
      custom_field_definitions: Table<CustomFieldDefinitionRecord>
      custom_field_values: Table<CustomFieldValueRecord>
      saved_views: Table<SavedViewRecord>
      notifications: Table<NotificationRecord>
      audit_events: Table<AuditEventRecord>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type PublicTableName = keyof Database["public"]["Tables"]
export type TableRow<T extends PublicTableName> = Database["public"]["Tables"][T]["Row"]
export type TableInsert<T extends PublicTableName> = Database["public"]["Tables"][T]["Insert"]
export type TableUpdate<T extends PublicTableName> = Database["public"]["Tables"][T]["Update"]
