import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, PublicTableName, TableRow } from "./database.types"
import type {
  AccountRecord,
  ActivityRecord,
  AuditEventRecord,
  AuditInput,
  CampaignRecord,
  ContactRecord,
  CustomFieldDefinitionRecord,
  DashboardSummary,
  DealSignal,
  EmailMessageRecord,
  EmailThreadRecord,
  Json,
  LeadConversionRecord,
  LeadRecord,
  ListRequest,
  MembershipRecord,
  NoteRecord,
  OpportunityRecord,
  Page,
  PipelineRecord,
  PriceBookRecord,
  ProductRecord,
  QuoteRecord,
  Result,
  SavedViewRecord,
  TaskRecord,
  TeamRecord,
  EntityType,
  WorkspaceRole,
} from "./domain"
import { appError, fail, ok } from "./errors"
import { applyFilters, pageRange, toPage, type FilterBuilder } from "./query"
import { supabase } from "./supabase"

interface QueryError { code?: string; message: string; status?: number }
interface QueryResponse<T> { data: T | null; error: QueryError | null; count?: number | null }

interface QueryBuilder extends FilterBuilder {
  select(columns?: string, options?: { count?: "exact" }): QueryBuilder
  insert(values: unknown): QueryBuilder
  upsert(values: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }): QueryBuilder
  update(values: unknown): QueryBuilder
  delete(): QueryBuilder
  order(field: string, options?: { ascending?: boolean }): QueryBuilder
  range(from: number, to: number): QueryBuilder
  limit(count: number): QueryBuilder
  single(): QueryBuilder
  maybeSingle(): QueryBuilder
}

function from(client: SupabaseClient<Database>, table: PublicTableName): QueryBuilder {
  const dynamicClient = client as unknown as { from(name: string): unknown }
  return dynamicClient.from(table) as QueryBuilder
}

async function run<T>(query: QueryBuilder): Promise<QueryResponse<T>> {
  return await (query as unknown as PromiseLike<QueryResponse<T>>)
}

type Identifier = { id: string; workspace_id: string }
type CreateInput<T extends Identifier> = Omit<T, "id" | "created_at" | "updated_at"> & { id?: string }
type UpdateInput<T extends Identifier> = Partial<Omit<T, "id" | "workspace_id" | "created_at">>

export interface WorkspaceRepository<T extends Identifier> {
  list(workspaceId: string, request?: Partial<ListRequest<Extract<keyof T, string>>>): Promise<Result<Page<T>>>
  get(workspaceId: string, id: string): Promise<Result<T>>
  create(input: CreateInput<T>): Promise<Result<T>>
  update(workspaceId: string, id: string, changes: UpdateInput<T>): Promise<Result<T>>
  archive(workspaceId: string, id: string): Promise<Result<T>>
  remove(workspaceId: string, id: string): Promise<Result<void>>
}

export function createWorkspaceRepository<T extends Identifier>(
  table: PublicTableName,
  client: SupabaseClient<Database> = supabase,
): WorkspaceRepository<T> {
  return {
    async list(workspaceId, request = {}) {
      try {
        const paging = { page: request.page ?? 1, pageSize: request.pageSize ?? 25 }
        const { from: rangeFrom, to } = pageRange(paging)
        let query = from(client, table).select("*", { count: "exact" }).eq("workspace_id", workspaceId)
        query = applyFilters(query, request.filters)
        query = query.order(request.sort?.field ?? "updated_at", { ascending: request.sort?.direction === "asc" }).range(rangeFrom, to)
        const { data, error, count } = await run<T[]>(query)
        return error ? fail(error) : ok(toPage(data ?? [], count ?? 0, paging))
      } catch (error) {
        return fail(error)
      }
    },

    async get(workspaceId, id) {
      const { data, error } = await run<T>(from(client, table).select("*").eq("workspace_id", workspaceId).eq("id", id).single())
      return error ? fail(error) : ok(data as T)
    },

    async create(input) {
      const { data, error } = await run<T>(from(client, table).insert(input).select("*").single())
      return error ? fail(error) : ok(data as T)
    },

    async update(workspaceId, id, changes) {
      const { data, error } = await run<T>(
        from(client, table).update({ ...changes, updated_at: new Date().toISOString() }).eq("workspace_id", workspaceId).eq("id", id).select("*").single(),
      )
      return error ? fail(error) : ok(data as T)
    },

    async archive(workspaceId, id) {
      const { data, error } = await run<T>(
        from(client, table).update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("workspace_id", workspaceId).eq("id", id).select("*").single(),
      )
      return error ? fail(error) : ok(data as T)
    },

    async remove(workspaceId, id) {
      const { error } = await run<never>(from(client, table).delete().eq("workspace_id", workspaceId).eq("id", id))
      return error ? fail(error) : ok(undefined)
    },
  }
}

export interface AuditRepository {
  append(input: AuditInput): Promise<Result<AuditEventRecord>>
  list(workspaceId: string, request?: Partial<ListRequest>): Promise<Result<Page<AuditEventRecord>>>
}

export function createAuditRepository(client: SupabaseClient<Database> = supabase): AuditRepository {
  return {
    async append(input) {
      const event = {
        workspace_id: input.workspaceId,
        actor_id: input.actorId,
        created_by: input.actorId,
        created_by_status: "active",
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        summary: input.summary ?? `${input.action} ${input.entityType}`,
        before_data: input.before ?? null,
        after_data: input.after ?? null,
      }
      const { data, error } = await run<AuditEventRecord>(from(client, "audit_events").insert(event).select("*").single())
      return error ? fail(error) : ok(data as AuditEventRecord)
    },
    list(workspaceId, request = {}) {
      return createWorkspaceRepository<AuditEventRecord>("audit_events", client).list(workspaceId, {
        ...request,
        sort: request.sort ?? { field: "created_at", direction: "desc" },
      } as Partial<ListRequest<keyof AuditEventRecord>>)
    },
  }
}

export interface LeadConversionInput {
  workspaceId: string
  leadId: string
  actorId: string
  ownerId: string
  pipelineId: string
  stageId: string
  createOpportunity: boolean
  opportunityName?: string
  opportunityAmount?: number
  closeDate?: string | null
}

export interface LeadConversionResult {
  conversion: LeadConversionRecord
  account: AccountRecord
  contact: ContactRecord
  opportunity: OpportunityRecord | null
  reused: boolean
}

export interface LeadConversionRepository {
  convert(input: LeadConversionInput): Promise<Result<LeadConversionResult>>
}

export function createLeadConversionRepository(client: SupabaseClient<Database> = supabase): LeadConversionRepository {
  return {
    async convert(input) {
      const existing = await run<LeadConversionRecord>(
        from(client, "lead_conversions").select("*").eq("workspace_id", input.workspaceId).eq("lead_id", input.leadId).maybeSingle(),
      )
      if (existing.error) return fail(existing.error)
      if (existing.data?.state === "completed") return loadConversion(client, existing.data, true)
      if (existing.data?.state === "started") {
        return fail(appError("conflict", "This lead is already being converted. Try again after the current conversion finishes."))
      }

      const conversionId = existing.data?.id ?? crypto.randomUUID()
      const reservation = existing.data
        ? await run<LeadConversionRecord>(
            from(client, "lead_conversions").update({ state: "started", error_message: null, updated_at: new Date().toISOString() })
              .eq("workspace_id", input.workspaceId).eq("id", conversionId).eq("state", "compensated").select("*").single(),
          )
        : await run<LeadConversionRecord>(from(client, "lead_conversions").insert({
            id: conversionId,
            workspace_id: input.workspaceId,
            lead_id: input.leadId,
            account_id: null,
            contact_id: null,
            opportunity_id: null,
            state: "started",
            error_message: null,
            created_by: input.actorId,
            created_by_status: "active",
          }).select("*").single())
      if (reservation.error || !reservation.data) {
        if (reservation.error?.code === "23505" || reservation.error?.message.toLowerCase().includes("unique")) {
          return fail(appError("conflict", "This lead is already being converted. Try again after the current conversion finishes.", reservation.error))
        }
        return fail(reservation.error ?? new Error("Unable to reserve lead conversion"))
      }

      const leadResponse = await run<LeadRecord>(
        from(client, "leads").select("*").eq("workspace_id", input.workspaceId).eq("id", input.leadId).single(),
      )
      if (leadResponse.error || !leadResponse.data) {
        await run(from(client, "lead_conversions").update({ state: "compensated", error_message: "Lead not found" })
          .eq("workspace_id", input.workspaceId).eq("id", conversionId))
        return fail(leadResponse.error ?? new Error("Lead not found"))
      }
      const lead = leadResponse.data
      const accountId = crypto.randomUUID()
      const contactId = crypto.randomUUID()
      const opportunityId = input.createOpportunity ? crypto.randomUUID() : null
      const now = new Date().toISOString()
      const created: Array<{ table: PublicTableName; id: string }> = []
      let leadWasUpdated = false

      const compensate = async () => {
        for (const record of [...created].reverse()) {
          await run(from(client, record.table).delete().eq("workspace_id", input.workspaceId).eq("id", record.id))
        }
      }

      try {
        const accountPayload = {
          id: accountId, workspace_id: input.workspaceId, created_by: input.actorId, created_by_status: "active", owner_id: input.ownerId,
          name: lead.company, website: null, industry: null, employee_count: null, annual_revenue: null,
          domain: null, phone: null, address: {}, archived_at: null,
        }
        const account = await run<AccountRecord>(from(client, "accounts").insert(accountPayload).select("*").single())
        if (account.error || !account.data) throw account.error ?? new Error("Account creation failed")
        created.push({ table: "accounts", id: accountId })

        const contactPayload = {
          id: contactId, workspace_id: input.workspaceId, created_by: input.actorId, created_by_status: "active", owner_id: input.ownerId,
          account_id: accountId, first_name: lead.first_name, last_name: lead.last_name,
          email: lead.email, phone: lead.phone, title: null, department: null, archived_at: null,
        }
        const contact = await run<ContactRecord>(from(client, "contacts").insert(contactPayload).select("*").single())
        if (contact.error || !contact.data) throw contact.error ?? new Error("Contact creation failed")
        created.push({ table: "contacts", id: contactId })

        let opportunity: OpportunityRecord | null = null
        if (opportunityId) {
          const opportunityPayload = {
            id: opportunityId, workspace_id: input.workspaceId, created_by: input.actorId, created_by_status: "active", owner_id: input.ownerId,
            account_id: accountId, pipeline_id: input.pipelineId, stage_id: input.stageId,
            name: input.opportunityName ?? `${lead.company} opportunity`, value: input.opportunityAmount ?? 0,
            probability: 0, expected_close_date: input.closeDate ?? null, status: "open", stage_entered_at: now,
            loss_reason: null, archived_at: null,
          }
          const response = await run<OpportunityRecord>(from(client, "opportunities").insert(opportunityPayload).select("*").single())
          if (response.error || !response.data) throw response.error ?? new Error("Opportunity creation failed")
          opportunity = response.data
          created.push({ table: "opportunities", id: opportunityId })
        }

        const conversion = await run<LeadConversionRecord>(
          from(client, "lead_conversions").update({
            account_id: accountId, contact_id: contactId, opportunity_id: opportunityId,
            state: "completed", error_message: null, updated_at: now,
          }).eq("workspace_id", input.workspaceId).eq("id", conversionId).eq("state", "started").select("*").single(),
        )
        if (conversion.error || !conversion.data) throw conversion.error ?? new Error("Conversion record finalization failed")

        const leadUpdate = await run<LeadRecord>(
          from(client, "leads").update({ status: "converted", updated_at: now })
            .eq("workspace_id", input.workspaceId).eq("id", input.leadId).select("*").single(),
        )
        if (leadUpdate.error) throw leadUpdate.error
        leadWasUpdated = true

        const audit = await run<AuditEventRecord>(from(client, "audit_events").insert({
          workspace_id: input.workspaceId,
          actor_id: input.actorId,
          created_by: input.actorId,
          created_by_status: "active",
          action: "lead_converted",
          entity_type: "lead",
          entity_id: input.leadId,
          summary: `Converted ${lead.first_name} ${lead.last_name} into CRM records`,
          before_data: { status: lead.status },
          after_data: { status: "converted", account_id: accountId, contact_id: contactId, opportunity_id: opportunityId },
        }).select("*").single())
        if (audit.error) throw audit.error

        return ok({ conversion: conversion.data, account: account.data, contact: contact.data, opportunity, reused: false })
      } catch (error) {
        if (leadWasUpdated) {
          await run(from(client, "leads").update({ status: lead.status, updated_at: new Date().toISOString() })
            .eq("workspace_id", input.workspaceId).eq("id", input.leadId))
        }
        await compensate()
        const message = error instanceof Error ? error.message : "Conversion failed"
        await run(from(client, "lead_conversions").update({
          state: "compensated", error_message: message, account_id: null, contact_id: null, opportunity_id: null,
          updated_at: new Date().toISOString(),
        }).eq("workspace_id", input.workspaceId).eq("id", conversionId))
        return fail(error, "Lead conversion failed and its partial records were removed")
      }
    },
  }
}

async function loadConversion(
  client: SupabaseClient<Database>,
  conversion: LeadConversionRecord,
  reused: boolean,
): Promise<Result<LeadConversionResult>> {
  if (!conversion.account_id || !conversion.contact_id) {
    return fail(appError("conflict", "The saved conversion is incomplete and must be retried"))
  }
  const [account, contact, opportunity] = await Promise.all([
    run<AccountRecord>(from(client, "accounts").select("*").eq("workspace_id", conversion.workspace_id).eq("id", conversion.account_id).single()),
    run<ContactRecord>(from(client, "contacts").select("*").eq("workspace_id", conversion.workspace_id).eq("id", conversion.contact_id).single()),
    conversion.opportunity_id
      ? run<OpportunityRecord>(from(client, "opportunities").select("*").eq("workspace_id", conversion.workspace_id).eq("id", conversion.opportunity_id).single())
      : Promise.resolve({ data: null, error: null }),
  ])
  const error = account.error ?? contact.error ?? opportunity.error
  if (error || !account.data || !contact.data) return fail(error ?? new Error("Converted records not found"))
  return ok({ conversion, account: account.data, contact: contact.data, opportunity: opportunity.data, reused })
}

export function calculateQuoteTotals(
  items: readonly { quantity: number; unitPrice: number; discountPercent?: number; taxPercent?: number }[],
): { subtotalAmount: number; discountAmount: number; taxAmount: number; totalAmount: number } {
  const totals = items.reduce((sum, item) => {
    const line = item.quantity * item.unitPrice
    const discount = line * ((item.discountPercent ?? 0) / 100)
    const tax = (line - discount) * ((item.taxPercent ?? 0) / 100)
    return { subtotal: sum.subtotal + line, discount: sum.discount + discount, tax: sum.tax + tax }
  }, { subtotal: 0, discount: 0, tax: 0 })
  const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  return {
    subtotalAmount: money(totals.subtotal),
    discountAmount: money(totals.discount),
    taxAmount: money(totals.tax),
    totalAmount: money(totals.subtotal - totals.discount + totals.tax),
  }
}

export interface DashboardRepository {
  summary(workspaceId: string): Promise<Result<DashboardSummary>>
  dealSignals(workspaceId: string): Promise<Result<DealSignal[]>>
}

export function createDashboardRepository(client: SupabaseClient<Database> = supabase): DashboardRepository {
  return {
    async summary(workspaceId) {
      const monthStart = new Date()
      monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
      const now = new Date().toISOString()
      const [open, won, overdue] = await Promise.all([
        run<Pick<OpportunityRecord, "value" | "probability" | "stage_entered_at">[]>(from(client, "opportunities").select("value,probability,stage_entered_at").eq("workspace_id", workspaceId).eq("status", "open")),
        run<Pick<OpportunityRecord, "value">[]>(from(client, "opportunities").select("value").eq("workspace_id", workspaceId).eq("status", "won").gte("updated_at", monthStart.toISOString())),
        run<Pick<TaskRecord, "id">[]>(from(client, "tasks").select("id").eq("workspace_id", workspaceId).in("status", ["open", "in_progress"]).lt("due_at", now)),
      ])
      const error = open.error ?? won.error ?? overdue.error
      if (error) return fail(error)
      const openValue = (open.data ?? []).reduce((sum, row) => sum + row.value, 0)
      const weightedValue = (open.data ?? []).reduce((sum, row) => sum + row.value * row.probability / 100, 0)
      const staleThreshold = Date.now() - 30 * 86_400_000
      return ok({
        openPipelineValue: openValue,
        weightedPipelineValue: weightedValue,
        wonThisMonth: (won.data ?? []).reduce((sum, row) => sum + row.value, 0),
        overdueTasks: overdue.data?.length ?? 0,
        staleOpportunities: (open.data ?? []).filter((row) => Date.parse(row.stage_entered_at) < staleThreshold).length,
      })
    },
    async dealSignals(workspaceId) {
      const { data, error } = await run<Pick<OpportunityRecord, "id" | "name" | "stage_id" | "value" | "probability" | "expected_close_date" | "stage_entered_at">[]>(
        from(client, "opportunities").select("id,name,stage_id,value,probability,expected_close_date,stage_entered_at").eq("workspace_id", workspaceId).eq("status", "open")
          .order("value", { ascending: false }).limit(12),
      )
      if (error) return fail(error)
      const day = 86_400_000
      const opportunityIds = (data ?? []).map((row) => row.id)
      const stageIds = [...new Set((data ?? []).map((row) => row.stage_id))]
      const [activities, stages] = await Promise.all([
        opportunityIds.length === 0
          ? Promise.resolve({ data: [], error: null })
          : run<Pick<ActivityRecord, "opportunity_id" | "occurred_at">[]>(
            from(client, "activities").select("opportunity_id,occurred_at").eq("workspace_id", workspaceId)
              .in("opportunity_id", opportunityIds).order("occurred_at", { ascending: false }),
          ),
        stageIds.length === 0
          ? Promise.resolve({ data: [], error: null })
          : run<Array<{ id: string; name: string }>>(
              from(client, "pipeline_stages").select("id,name").eq("workspace_id", workspaceId).in("id", stageIds),
            ),
      ])
      if (activities.error || stages.error) return fail(activities.error ?? stages.error ?? new Error("Deal signals failed to load"))
      const latestActivity = new Map<string, string>()
      const stageNames = new Map((stages.data ?? []).map((stage) => [stage.id, stage.name]))
      for (const activity of activities.data ?? []) {
        if (activity.opportunity_id && !latestActivity.has(activity.opportunity_id)) {
          latestActivity.set(activity.opportunity_id, activity.occurred_at)
        }
      }
      return ok((data ?? []).map((row) => {
        const age = Math.max(0, Math.floor((Date.now() - Date.parse(row.stage_entered_at)) / day))
        const lastActivity = latestActivity.get(row.id)
        const activityAge = lastActivity ? Math.max(0, Math.floor((Date.now() - Date.parse(lastActivity)) / day)) : null
        const risk = age > 30 || activityAge === null || activityAge > 21 ? "high" : age > 14 || activityAge > 10 ? "medium" : "low"
        return {
          opportunityId: row.id,
          name: row.name,
          stageName: stageNames.get(row.stage_id) ?? "Unassigned",
          stageAgeDays: age,
          daysSinceActivity: activityAge,
          value: row.value,
          probability: row.probability,
          expectedCloseDate: row.expected_close_date,
          risk,
        }
      }))
    },
  }
}

export function createCrmRepositories(client: SupabaseClient<Database> = supabase) {
  return {
    accounts: createWorkspaceRepository<AccountRecord>("accounts", client),
    contacts: createWorkspaceRepository<ContactRecord>("contacts", client),
    leads: createWorkspaceRepository<LeadRecord>("leads", client),
    opportunities: createWorkspaceRepository<OpportunityRecord>("opportunities", client),
    pipelines: createWorkspaceRepository<PipelineRecord>("pipelines", client),
    activities: createWorkspaceRepository<ActivityRecord>("activities", client),
    tasks: createWorkspaceRepository<TaskRecord>("tasks", client),
    products: createWorkspaceRepository<ProductRecord>("products", client),
    priceBooks: createWorkspaceRepository<PriceBookRecord>("price_books", client),
    quotes: createWorkspaceRepository<QuoteRecord>("quotes", client),
    campaigns: createWorkspaceRepository<CampaignRecord>("campaigns", client),
    notes: createWorkspaceRepository<NoteRecord>("notes", client),
    emailThreads: createWorkspaceRepository<EmailThreadRecord>("email_threads", client),
    emailMessages: createWorkspaceRepository<EmailMessageRecord>("email_messages", client),
    customFields: createWorkspaceRepository<CustomFieldDefinitionRecord>("custom_field_definitions", client),
    savedViews: createWorkspaceRepository<SavedViewRecord>("saved_views", client),
    members: createWorkspaceRepository<MembershipRecord>("workspace_members", client),
    teams: createWorkspaceRepository<TeamRecord>("teams", client),
    audit: createAuditRepository(client),
    leadConversion: createLeadConversionRepository(client),
    dashboard: createDashboardRepository(client),
  }
}

export type CrmRepositories = ReturnType<typeof createCrmRepositories>

export type RecordFor<T extends PublicTableName> = TableRow<T>
export type JsonRecord = Record<string, Json>

export const CRM_TABLES = {
  accounts: "accounts",
  contacts: "contacts",
  leads: "leads",
  opportunities: "opportunities",
  pipelines: "pipelines",
  pipelineStages: "pipeline_stages",
  tags: "tags",
  accountTags: "account_tags",
  contactTags: "contact_tags",
  opportunityContacts: "opportunity_contacts",
  opportunityTags: "opportunity_tags",
  activities: "activities",
  activityParticipants: "activity_participants",
  tasks: "tasks",
  taskAssignees: "task_assignees",
  products: "products",
  priceBooks: "price_books",
  priceBookItems: "price_book_items",
  quotes: "quotes",
  quoteLines: "quote_lines",
  campaigns: "campaigns",
  campaignMembers: "campaign_members",
  notes: "notes",
  emailThreads: "email_threads",
  emailMessages: "email_messages",
  customFields: "custom_field_definitions",
  customFieldValues: "custom_field_values",
  savedViews: "saved_views",
  notifications: "notifications",
  members: "workspace_members",
  teams: "teams",
  teamMemberships: "team_memberships",
} as const satisfies Record<string, PublicTableName>

export type CrmTableName = (typeof CRM_TABLES)[keyof typeof CRM_TABLES]

export interface MutationContext {
  workspaceId: string
  userId: string
  role?: WorkspaceRole
  ownerId?: string
  audit?: boolean
  entityType?: EntityType
}

const entityTypes: Partial<Record<CrmTableName, EntityType>> = {
  accounts: "account",
  contacts: "contact",
  leads: "lead",
  opportunities: "opportunity",
  activities: "activity",
  tasks: "task",
  products: "product",
  price_books: "price_book",
  quotes: "quote",
  campaigns: "campaign",
  custom_field_definitions: "custom_field",
  saved_views: "saved_view",
}

const administratorCreatedTables = new Set<CrmTableName>([
  "teams",
  "team_memberships",
  "tags",
  "pipelines",
  "pipeline_stages",
  "products",
  "price_books",
  "price_book_items",
  "custom_field_definitions",
])

const membershipAttestedTables = new Set<CrmTableName>(
  Object.values(CRM_TABLES).filter((table) => table !== "workspace_members"),
)

const createdAtOnlyTables = new Set<CrmTableName>([
  "tags",
  "account_tags",
  "contact_tags",
  "pipeline_stages",
  "opportunity_contacts",
  "opportunity_tags",
  "activity_participants",
  "task_assignees",
  "team_memberships",
])

export interface CrmRepository {
  list<T extends CrmTableName>(table: T, workspaceId: string, query?: Partial<ListRequest>): Promise<Result<Page<TableRow<T>>>>
  create<T extends CrmTableName>(table: T, payload: Partial<TableRow<T>>, context: MutationContext): Promise<Result<TableRow<T>>>
  update<T extends CrmTableName>(table: T, id: string, payload: Partial<TableRow<T>>, context: MutationContext): Promise<Result<TableRow<T>>>
  archive<T extends CrmTableName>(table: T, id: string, context: MutationContext): Promise<Result<TableRow<T>>>
  remove<T extends CrmTableName>(table: T, id: string, context: MutationContext): Promise<Result<void>>
  appendAudit(input: AuditInput): Promise<Result<AuditEventRecord>>
  convertLead(input: LeadConversionInput): Promise<Result<LeadConversionResult>>
  updateOpportunityStage(workspaceId: string, opportunityId: string, stageId: string, context: MutationContext): Promise<Result<OpportunityRecord>>
  dashboardSummary(workspaceId: string): Promise<Result<DashboardSummary>>
  dealSignals(workspaceId: string): Promise<Result<DealSignal[]>>
}

function asJson(value: unknown): Json {
  return value as Json
}

export function createCrmRepository(client: SupabaseClient<Database> = supabase): CrmRepository {
  const audit = createAuditRepository(client)
  const conversions = createLeadConversionRepository(client)
  const dashboard = createDashboardRepository(client)

  async function recordAudit(
    table: CrmTableName,
    action: string,
    entityId: string,
    before: unknown,
    after: unknown,
    context: MutationContext,
  ): Promise<Result<AuditEventRecord> | null> {
    if (context.audit === false) return null
    const entityType = context.entityType ?? entityTypes[table]
    if (!entityType) return null
    return audit.append({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      action,
      entityType,
      entityId,
      before: before === undefined ? null : asJson(before),
      after: after === undefined ? null : asJson(after),
    })
  }

  const repository: CrmRepository = {
    async list<T extends CrmTableName>(table: T, workspaceId: string, query: Partial<ListRequest> = {}) {
      const paging = { page: query.page ?? 1, pageSize: query.pageSize ?? 25 }
      const range = pageRange(paging)
      let builder = from(client, table).select("*", { count: "exact" }).eq("workspace_id", workspaceId)
      builder = applyFilters(builder, query.filters)
      const defaultSort = createdAtOnlyTables.has(table) ? "created_at" : "updated_at"
      builder = builder.order(query.sort?.field ?? defaultSort, { ascending: query.sort?.direction === "asc" }).range(range.from, range.to)
      const response = await run<TableRow<T>[]>(builder)
      return response.error ? fail(response.error) : ok(toPage(response.data ?? [], response.count ?? 0, paging))
    },

    async create<T extends CrmTableName>(table: T, payload: Partial<TableRow<T>>, context: MutationContext) {
      const values = {
        ...payload,
        workspace_id: context.workspaceId,
        created_by: context.userId,
        ...(context.ownerId ? { owner_id: context.ownerId } : {}),
        ...(membershipAttestedTables.has(table) ? { created_by_status: "active" } : {}),
        ...(administratorCreatedTables.has(table) && context.role ? { created_by_role: context.role } : {}),
      }
      const response = await run<TableRow<T>>(from(client, table).insert(values).select("*").single())
      if (response.error || !response.data) return fail(response.error ?? new Error("Record was not created"))
      const auditResult = await recordAudit(table, "created", String(response.data.id), undefined, response.data, context)
      if (auditResult && !auditResult.ok) {
        await run(from(client, table).delete().eq("workspace_id", context.workspaceId).eq("id", response.data.id))
        return auditResult
      }
      return ok(response.data)
    },

    async update<T extends CrmTableName>(table: T, id: string, payload: Partial<TableRow<T>>, context: MutationContext) {
      const before = await run<TableRow<T>>(from(client, table).select("*").eq("workspace_id", context.workspaceId).eq("id", id).single())
      if (before.error || !before.data) return fail(before.error ?? new Error("Record not found"))
      const changes = { ...payload, updated_at: new Date().toISOString() }
      const response = await run<TableRow<T>>(
        from(client, table).update(changes).eq("workspace_id", context.workspaceId).eq("id", id).select("*").single(),
      )
      if (response.error || !response.data) return fail(response.error ?? new Error("Record was not updated"))
      const auditResult = await recordAudit(table, "updated", id, before.data, response.data, context)
      if (auditResult && !auditResult.ok) {
        const { id: _id, workspace_id: _workspaceId, created_at: _createdAt, ...restore } = before.data
        void _id; void _workspaceId; void _createdAt
        await run(from(client, table).update(restore).eq("workspace_id", context.workspaceId).eq("id", id))
        return auditResult
      }
      return ok(response.data)
    },

    archive<T extends CrmTableName>(table: T, id: string, context: MutationContext) {
      return repository.update(table, id, { archived_at: new Date().toISOString() } as Partial<TableRow<T>>, context)
    },

    async remove<T extends CrmTableName>(table: T, id: string, context: MutationContext) {
      const before = await run<TableRow<T>>(from(client, table).select("*").eq("workspace_id", context.workspaceId).eq("id", id).single())
      if (before.error || !before.data) return fail(before.error ?? new Error("Record not found"))
      const response = await run(from(client, table).delete().eq("workspace_id", context.workspaceId).eq("id", id))
      if (response.error) return fail(response.error)
      const auditResult = await recordAudit(table, "deleted", id, before.data, undefined, context)
      return auditResult && !auditResult.ok ? auditResult : ok(undefined)
    },

    appendAudit: audit.append,
    convertLead: conversions.convert,
    updateOpportunityStage(workspaceId, opportunityId, stageId, context) {
      return repository.update("opportunities", opportunityId, {
        stage_id: stageId,
        stage_entered_at: new Date().toISOString(),
      }, { ...context, workspaceId, entityType: "opportunity" })
    },
    dashboardSummary: dashboard.summary,
    dealSignals: dashboard.dealSignals,
  }
  return repository
}

export const crmRepository = createCrmRepository()
