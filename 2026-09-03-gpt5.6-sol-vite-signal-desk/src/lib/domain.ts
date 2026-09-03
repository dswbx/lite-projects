export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type WorkspaceRole = "owner" | "admin" | "manager" | "member"
export type EntityType =
  | "workspace"
  | "file"
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "activity"
  | "task"
  | "product"
  | "price_book"
  | "quote"
  | "campaign"
  | "custom_field"
  | "saved_view"

export type LeadStatus = "new" | "working" | "qualified" | "converted" | "disqualified"
export type OpportunityStatus = "open" | "won" | "lost"
export type TaskStatus = "open" | "in_progress" | "completed" | "cancelled"
export type ActivityType = "call" | "email" | "meeting" | "note" | "demo" | "stage_change"
export type CampaignStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled"
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired"
export type SortDirection = "asc" | "desc"

export interface PageRequest {
  page: number
  pageSize: number
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "is"

export interface Filter<Field extends string = string> {
  field: Field
  operator: FilterOperator
  value: string | number | boolean | null | readonly (string | number)[]
}

export interface Sort<Field extends string = string> {
  field: Field
  direction: SortDirection
}

export interface ListRequest<Field extends string = string> extends PageRequest {
  filters?: readonly Filter<Field>[]
  sort?: Sort<Field>
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError }

export type AppErrorCode =
  | "authentication"
  | "authorization"
  | "conflict"
  | "configuration"
  | "network"
  | "not_found"
  | "validation"
  | "storage"
  | "unknown"

export interface AppError {
  code: AppErrorCode
  message: string
  cause?: unknown
  retryable: boolean
}

export interface BaseRecord {
  id: string
  created_at: string
  updated_at: string
}

export interface WorkspaceRecord extends BaseRecord {
  name: string
  slug: string
  owner_id: string
  created_by: string
  plan: "trial" | "starter" | "growth" | "enterprise"
  timezone: string
  currency: string
  archived_at: string | null
}

export interface ProfileRecord extends BaseRecord {
  email: string
  full_name: string
  avatar_url: string | null
  job_title: string | null
  locale: string
}

export interface MembershipRecord extends BaseRecord {
  workspace_id: string
  workspace_owner_id: string
  created_by: string
  user_id: string
  role: WorkspaceRole
  status: "invited" | "active" | "suspended"
  invited_email: string | null
  joined_at: string | null
}

export interface TenantRecordBase extends BaseRecord {
  workspace_id: string
  created_by: string
}

export interface WorkspaceRecordBase extends TenantRecordBase {
  owner_id: string
  archived_at: string | null
}

export interface TeamRecord extends TenantRecordBase {
  name: string
  description: string | null
  archived_at: string | null
}

export interface AccountRecord extends WorkspaceRecordBase {
  name: string
  domain: string | null
  website: string | null
  industry: string | null
  segment: "smb" | "mid_market" | "enterprise"
  lifecycle_stage: "prospect" | "qualified" | "customer" | "partner" | "inactive"
  employee_count: number | null
  annual_revenue: number | null
  phone: string | null
  address: Json
}

export interface ContactRecord extends WorkspaceRecordBase {
  account_id: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  title: string | null
  department: string | null
  lifecycle_stage: "lead" | "qualified" | "customer" | "former_customer"
  preferred_channel: "email" | "phone" | "social"
}

export interface LeadRecord extends WorkspaceRecordBase {
  first_name: string
  last_name: string
  company: string
  email: string | null
  phone: string | null
  status: LeadStatus
  source: string
  score: number
}

export interface LeadConversionRecord extends BaseRecord {
  workspace_id: string
  created_by: string
  lead_id: string
  account_id: string | null
  contact_id: string | null
  opportunity_id: string | null
  state: "started" | "completed" | "compensated"
  error_message: string | null
}

export interface PipelineRecord extends TenantRecordBase {
  name: string
  is_default: boolean
}

export interface PipelineStageRecord {
  id: string
  created_at: string
  workspace_id: string
  created_by: string
  pipeline_id: string
  name: string
  position: number
  probability: number
  stage_type: "open" | "won" | "lost"
}

export interface OpportunityRecord extends WorkspaceRecordBase {
  account_id: string
  pipeline_id: string
  stage_id: string
  name: string
  value: number
  probability: number
  expected_close_date: string | null
  status: OpportunityStatus
  stage_entered_at: string
  loss_reason: string | null
}

export interface ActivityRecord extends WorkspaceRecordBase {
  type: ActivityType
  subject: string
  description: string | null
  occurred_at: string
  duration_minutes: number | null
  outcome: string | null
  account_id: string | null
  contact_id: string | null
  opportunity_id: string | null
}

export interface TaskRecord extends WorkspaceRecordBase {
  title: string
  description: string | null
  status: TaskStatus
  priority: "low" | "normal" | "high" | "urgent"
  due_at: string | null
  completed_at: string | null
  account_id: string | null
  contact_id: string | null
  opportunity_id: string | null
}

export interface ProductRecord extends TenantRecordBase {
  name: string
  sku: string
  description: string | null
  unit_price: number
  billing_period: "one_time" | "monthly" | "annual"
  is_active: boolean
}

export interface PriceBookRecord extends TenantRecordBase {
  name: string
  currency: string
  is_active: boolean
  valid_from: string | null
  valid_until: string | null
}

export interface PriceBookItemRecord extends BaseRecord {
  workspace_id: string
  created_by: string
  price_book_id: string
  product_id: string
  unit_price: number
  minimum_quantity: number
}

export interface QuoteRecord extends WorkspaceRecordBase {
  opportunity_id: string
  price_book_id: string | null
  quote_number: string
  status: QuoteStatus
  issued_at: string | null
  discount_percent: number
  subtotal_amount: number
  tax_amount: number
  total_amount: number
  notes: string | null
  expires_at: string | null
}

export interface CampaignRecord extends WorkspaceRecordBase {
  name: string
  status: CampaignStatus
  channel: "email" | "event" | "webinar" | "social" | "partner"
  start_date: string | null
  end_date: string | null
  budget: number
  actual_cost: number
}

export interface NoteRecord extends WorkspaceRecordBase {
  entity_type: EntityType
  entity_id: string
  body: string
  is_pinned: boolean
}

export interface CustomFieldDefinitionRecord extends TenantRecordBase {
  entity_type: EntityType
  name: string
  data_type: "text" | "number" | "boolean" | "date" | "select"
  options: Json
  is_required: boolean
  position: number
  archived_at: string | null
}

export interface CustomFieldValueRecord extends BaseRecord {
  workspace_id: string
  created_by: string
  definition_id: string
  entity_type: EntityType
  entity_id: string
  value: Json
}

export interface SavedViewRecord extends WorkspaceRecordBase {
  entity_type: EntityType
  name: string
  filters: Json
  sorts: Json
  visible_columns: Json
  is_shared: boolean
}

export interface FileRecord extends BaseRecord {
  workspace_id: string
  created_by: string
  owner_id: string
  storage_bucket: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  checksum: string | null
  archived_at: string | null
}

export interface FileLinkRecord {
  id: string
  created_at: string
  workspace_id: string
  created_by: string
  file_asset_id: string
  entity_type: EntityType
  entity_id: string
}

export interface EmailThreadRecord extends WorkspaceRecordBase {
  subject: string
  account_id: string | null
  contact_id: string | null
  opportunity_id: string | null
}

export interface EmailMessageRecord extends BaseRecord {
  workspace_id: string
  created_by: string
  thread_id: string
  direction: "inbound" | "outbound"
  sender_email: string
  recipient_emails: Json
  body_text: string
  sent_at: string | null
  delivery_status: "recorded" | "sent" | "delivered" | "bounced"
  owner_id: string
}

export interface AuditEventRecord {
  id: string
  workspace_id: string
  actor_id: string
  created_by: string
  action: string
  entity_type: EntityType
  entity_id: string
  summary: string
  before_data: Json | null
  after_data: Json | null
  created_at: string
}

export interface NotificationRecord extends BaseRecord {
  workspace_id: string
  created_by: string
  user_id: string
  type: "assignment" | "mention" | "deadline" | "stage_change" | "system"
  title: string
  body: string | null
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
}

export interface DashboardSummary {
  openPipelineValue: number
  weightedPipelineValue: number
  wonThisMonth: number
  overdueTasks: number
  staleOpportunities: number
}

export interface DealSignal {
  opportunityId: string
  name: string
  stageName: string
  stageAgeDays: number
  daysSinceActivity: number | null
  value: number
  probability: number
  expectedCloseDate: string | null
  risk: "low" | "medium" | "high"
}

export interface AttachmentTarget {
  workspaceId: string
  entityType: EntityType
  entityId: string
}

export interface AuditInput {
  workspaceId: string
  actorId: string
  action: string
  entityType: EntityType
  entityId: string
  summary?: string
  before?: Json | null
  after?: Json | null
}
