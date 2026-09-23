import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"
import type { Database } from "./database.types"
import type { LeadConversionRecord } from "./domain"
import { calculateQuoteTotals, createLeadConversionRepository, createWorkspaceRepository } from "./repositories"

describe("calculateQuoteTotals", () => {
  it("applies line discounts before tax and rounds currency totals", () => {
    expect(calculateQuoteTotals([
      { quantity: 2, unitPrice: 19.99, discountPercent: 10, taxPercent: 8.25 },
      { quantity: 1, unitPrice: 5 },
    ])).toEqual({ subtotalAmount: 44.98, discountAmount: 4, taxAmount: 2.97, totalAmount: 43.95 })
  })
})

type Response = { data: unknown; error: { code?: string; message: string } | null; count?: number }

class QueuedQuery {
  action = "select"
  readonly table: string
  private readonly responses: Response[]
  private readonly deletions: string[]

  constructor(table: string, responses: Response[], deletions: string[]) {
    this.table = table
    this.responses = responses
    this.deletions = deletions
  }

  select() { return this }
  insert() { this.action = "insert"; return this }
  update() { this.action = "update"; return this }
  delete() { this.action = "delete"; this.deletions.push(this.table); return this }
  eq() { return this }
  neq() { return this }
  gt() { return this }
  gte() { return this }
  lt() { return this }
  lte() { return this }
  like() { return this }
  ilike() { return this }
  in() { return this }
  is() { return this }
  order() { return this }
  range() { return this }
  limit() { return this }
  single() { return this }
  maybeSingle() { return this }
  then<TResult1 = Response>(onfulfilled?: ((value: Response) => TResult1 | PromiseLike<TResult1>) | null): Promise<TResult1> {
    const response = this.responses.shift() ?? { data: null, error: null }
    return Promise.resolve(onfulfilled ? onfulfilled(response) : response as TResult1)
  }
}

describe("lead conversion recovery", () => {
  it("retries a compensated conversion and removes partial records when a later write fails", async () => {
    const now = "2026-09-03T10:00:00.000Z"
    const conversion: LeadConversionRecord = {
      id: "conversion-1", workspace_id: "workspace-1", lead_id: "lead-1",
      account_id: null, contact_id: null, opportunity_id: null,
      state: "compensated", error_message: "previous failure", created_by: "user-1", created_at: now, updated_at: now,
    }
    const lead = {
      id: "lead-1", workspace_id: "workspace-1", first_name: "Ana", last_name: "Silva", company: "Acme",
      email: "ana@example.test", phone: null, status: "qualified", source: "web", score: 70,
      owner_id: "user-1", created_by: "user-1", archived_at: null, created_at: now, updated_at: now,
    }
    const responses: Response[] = [
      { data: conversion, error: null },
      { data: { ...conversion, state: "started" }, error: null },
      { data: lead, error: null },
      { data: { id: "ours-account" }, error: null },
      { data: null, error: { message: "contact insert failed" } },
      { data: null, error: null },
      { data: null, error: null },
    ]
    const deletions: string[] = []
    const fakeClient = {
      from(table: string) { return new QueuedQuery(table, responses, deletions) },
    } as unknown as SupabaseClient<Database>

    const result = await createLeadConversionRepository(fakeClient).convert({
      workspaceId: "workspace-1", leadId: "lead-1", actorId: "user-1", ownerId: "user-1",
      pipelineId: "pipeline-1", stageId: "stage-1", createOpportunity: false,
    })

    expect(result.ok).toBe(false)
    expect(deletions).toEqual(["accounts"])
  })
})

describe("workspace repository operations", () => {
  it("maps list, get, create, update, archive, and remove through the shared Supabase query contract", async () => {
    type Record = {
      id: string
      workspace_id: string
      name: string
      created_at: string
      updated_at: string
      archived_at: string | null
    }
    const row: Record = {
      id: "account-1",
      workspace_id: "workspace-1",
      name: "Signal account",
      created_at: "2026-09-03T10:00:00.000Z",
      updated_at: "2026-09-03T10:00:00.000Z",
      archived_at: null,
    }
    const responses: Response[] = [
      { data: [row], error: null, count: 1 },
      { data: row, error: null },
      { data: row, error: null },
      { data: { ...row, name: "Updated account" }, error: null },
      { data: { ...row, archived_at: "2026-09-03T11:00:00.000Z" }, error: null },
      { data: null, error: null },
    ]
    const deletions: string[] = []
    const fakeClient = {
      from(table: string) { return new QueuedQuery(table, responses, deletions) },
    } as unknown as SupabaseClient<Database>
    const repository = createWorkspaceRepository<Record>("accounts", fakeClient)

    expect(await repository.list("workspace-1")).toMatchObject({ ok: true, data: { total: 1 } })
    expect(await repository.get("workspace-1", row.id)).toMatchObject({ ok: true, data: row })
    expect(await repository.create({ ...row })).toMatchObject({ ok: true, data: row })
    expect(await repository.update("workspace-1", row.id, { name: "Updated account" })).toMatchObject({ ok: true, data: { name: "Updated account" } })
    expect(await repository.archive("workspace-1", row.id)).toMatchObject({ ok: true, data: { archived_at: expect.any(String) } })
    expect(await repository.remove("workspace-1", row.id)).toEqual({ ok: true, data: undefined })
    expect(deletions).toEqual(["accounts"])
  })
})
