import { describe, expect, it, vi } from "vitest"
import { applyFilters, normalizePage, pageRange, toPage, type FilterBuilder } from "./query"

describe("pagination", () => {
  it("normalizes unsafe paging input and uses inclusive PostgREST ranges", () => {
    expect(normalizePage({ page: -3, pageSize: 500 })).toEqual({ page: 1, pageSize: 100 })
    expect(pageRange({ page: 3, pageSize: 25 })).toEqual({ from: 50, to: 74 })
    expect(toPage(["a"], 51, { page: 3, pageSize: 25 })).toEqual({
      items: ["a"], page: 3, pageSize: 25, total: 51, pageCount: 3,
    })
  })
})

describe("filters", () => {
  it("maps supported filters to their Supabase query methods", () => {
    const builder = {
      eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    } as unknown as FilterBuilder
    applyFilters(builder, [
      { field: "status", operator: "eq", value: "open" },
      { field: "name", operator: "ilike", value: "%acme%" },
      { field: "owner_id", operator: "in", value: ["u1", "u2"] },
      { field: "archived_at", operator: "is", value: null },
    ])
    expect(builder.eq).toHaveBeenCalledWith("status", "open")
    expect(builder.ilike).toHaveBeenCalledWith("name", "%acme%")
    expect(builder.in).toHaveBeenCalledWith("owner_id", ["u1", "u2"])
    expect(builder.is).toHaveBeenCalledWith("archived_at", null)
  })

  it("rejects an invalid in-filter before a request is sent", () => {
    const builder = { in: vi.fn() } as unknown as FilterBuilder
    expect(() => applyFilters(builder, [{ field: "id", operator: "in", value: "not-an-array" }])).toThrow("requires an array")
  })
})
