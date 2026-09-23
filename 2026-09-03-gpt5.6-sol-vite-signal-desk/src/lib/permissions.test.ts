import { describe, expect, it } from "vitest"
import type { WorkspaceRole } from "./domain"
import { canPerform, canViewAudit, permissionsFor, type CrmResource } from "./permissions"

const roles: WorkspaceRole[] = ["owner", "admin", "manager", "member"]
const administrativeResources: CrmResource[] = [
  "workspace_members", "teams", "pipelines", "pipeline_stages", "products",
  "price_books", "price_book_items", "custom_field_definitions",
]
const salesResources: CrmResource[] = [
  "accounts", "contacts", "leads", "opportunities", "activities", "tasks",
  "quotes", "campaigns", "notes", "file_assets", "custom_field_values", "saved_views",
]

describe("CRM permission affordances", () => {
  it.each(roles)("allows %s to read ordinary workspace records", (role) => {
    for (const resource of [...administrativeResources, ...salesResources]) {
      expect(canPerform({ role, resource, action: "read", userId: "user-1" })).toBe(true)
    }
  })

  it.each(administrativeResources.filter((resource) => resource !== "workspace_members"))("allows owner/admin, but not manager/member, to manage %s", (resource) => {
    for (const role of ["owner", "admin"] as const) {
      expect(permissionsFor({ role, resource, userId: "user-1" })).toEqual({
        read: true, create: true, update: true, delete: true,
      })
    }
    for (const role of ["manager", "member"] as const) {
      expect(canPerform({ role, resource, action: "create", userId: "user-1" })).toBe(false)
      expect(canPerform({ role, resource, action: "update", userId: "user-1" })).toBe(false)
      expect(canPerform({ role, resource, action: "delete", userId: "user-1" })).toBe(false)
    }
  })

  it("reserves membership changes for the workspace owner", () => {
    expect(permissionsFor({ role: "owner", resource: "workspace_members", userId: "owner-1" })).toEqual({
      read: true, create: true, update: true, delete: true,
    })
    for (const role of ["admin", "manager", "member"] as const) {
      expect(permissionsFor({ role, resource: "workspace_members", userId: "user-1" })).toEqual({
        read: true, create: false, update: false, delete: false,
      })
    }
  })

  it.each(salesResources)("allows managers to manage %s", (resource) => {
    expect(permissionsFor({ role: "manager", resource, userId: "manager-1" })).toEqual({
      read: true, create: true, update: true, delete: true,
    })
  })

  it.each(salesResources)("allows members to create %s", (resource) => {
    expect(canPerform({ role: "member", resource, action: "create", userId: "member-1" })).toBe(true)
  })

  it("allows members to update their own records, but not someone else's", () => {
    expect(canPerform({
      role: "member", resource: "opportunities", action: "update", userId: "member-1", ownerId: "member-1",
    })).toBe(true)
    expect(canPerform({
      role: "member", resource: "opportunities", action: "update", userId: "member-1", ownerId: "member-2",
    })).toBe(false)
  })

  it("allows members to update assigned tasks even when they are not the owner", () => {
    expect(canPerform({
      role: "member", resource: "tasks", action: "update", userId: "member-1",
      ownerId: "manager-1", assigneeIds: ["member-1"],
    })).toBe(true)
    expect(canPerform({
      role: "member", resource: "tasks", action: "update", userId: "member-1",
      ownerId: "manager-1", assigneeIds: ["member-2"],
    })).toBe(false)
  })

  it("does not expose destructive actions to ordinary members", () => {
    expect(canPerform({
      role: "member", resource: "accounts", action: "delete", userId: "member-1", ownerId: "member-1",
    })).toBe(false)
  })

  it.each([
    ["owner", true], ["admin", true], ["manager", true], ["member", false],
  ] as const)("sets audit visibility for %s to %s", (role, expected) => {
    expect(canViewAudit(role)).toBe(expected)
    expect(canPerform({ role, resource: "audit_events", action: "read", userId: "user-1" })).toBe(expected)
    expect(canPerform({ role, resource: "audit_events", action: "create", userId: "user-1" })).toBe(false)
  })
})
