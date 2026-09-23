import type { Filter, ListRequest, Page } from "./domain"

export function normalizePage(request: Partial<Pick<ListRequest, "page" | "pageSize">>): Pick<ListRequest, "page" | "pageSize"> {
  const page = Number.isFinite(request.page) ? Math.max(1, Math.floor(request.page ?? 1)) : 1
  const pageSize = Number.isFinite(request.pageSize) ? Math.min(100, Math.max(1, Math.floor(request.pageSize ?? 25))) : 25
  return { page, pageSize }
}

export function pageRange(request: Partial<Pick<ListRequest, "page" | "pageSize">>): { from: number; to: number } {
  const { page, pageSize } = normalizePage(request)
  const from = (page - 1) * pageSize
  return { from, to: from + pageSize - 1 }
}

export function toPage<T>(items: T[], total: number, request: Partial<Pick<ListRequest, "page" | "pageSize">>): Page<T> {
  const { page, pageSize } = normalizePage(request)
  return {
    items,
    page,
    pageSize,
    total,
    pageCount: total === 0 ? 0 : Math.ceil(total / pageSize),
  }
}

export interface FilterBuilder {
  eq(field: string, value: unknown): this
  neq(field: string, value: unknown): this
  gt(field: string, value: unknown): this
  gte(field: string, value: unknown): this
  lt(field: string, value: unknown): this
  lte(field: string, value: unknown): this
  like(field: string, value: string): this
  ilike(field: string, value: string): this
  in(field: string, values: readonly unknown[]): this
  is(field: string, value: null | boolean): this
}

export function applyFilters<T extends FilterBuilder>(builder: T, filters: readonly Filter[] = []): T {
  let query: FilterBuilder = builder
  for (const filter of filters) {
    switch (filter.operator) {
      case "eq": query = query.eq(filter.field, filter.value); break
      case "neq": query = query.neq(filter.field, filter.value); break
      case "gt": query = query.gt(filter.field, filter.value); break
      case "gte": query = query.gte(filter.field, filter.value); break
      case "lt": query = query.lt(filter.field, filter.value); break
      case "lte": query = query.lte(filter.field, filter.value); break
      case "like": query = query.like(filter.field, String(filter.value)); break
      case "ilike": query = query.ilike(filter.field, String(filter.value)); break
      case "in": {
        if (!Array.isArray(filter.value)) throw new TypeError(`Filter ${filter.field} requires an array`)
        query = query.in(filter.field, filter.value)
        break
      }
      case "is": {
        if (filter.value !== null && typeof filter.value !== "boolean") throw new TypeError(`Filter ${filter.field} requires null or boolean`)
        query = query.is(filter.field, filter.value)
        break
      }
    }
  }
  return query as T
}
