import type { WorkspaceRole } from "./domain"

export type PermissionAction = "read" | "create" | "update" | "delete"

export type CrmResource =
  | "workspace"
  | "workspace_members"
  | "teams"
  | "pipelines"
  | "pipeline_stages"
  | "accounts"
  | "contacts"
  | "leads"
  | "opportunities"
  | "activities"
  | "tasks"
  | "products"
  | "price_books"
  | "price_book_items"
  | "quotes"
  | "campaigns"
  | "notes"
  | "file_assets"
  | "custom_field_definitions"
  | "custom_field_values"
  | "saved_views"
  | "notifications"
  | "audit_events"

export interface PermissionContext {
  role: WorkspaceRole
  resource: CrmResource
  action: PermissionAction
  userId: string
  ownerId?: string | null
  assigneeIds?: readonly string[]
}

export interface ResourcePermissions {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

const administrativeResources = new Set<CrmResource>([
  "workspace",
  "workspace_members",
  "teams",
  "pipelines",
  "pipeline_stages",
  "products",
  "price_books",
  "price_book_items",
  "custom_field_definitions",
])

const salesResources = new Set<CrmResource>([
  "accounts",
  "contacts",
  "leads",
  "opportunities",
  "activities",
  "tasks",
  "quotes",
  "campaigns",
  "notes",
  "file_assets",
  "custom_field_values",
  "saved_views",
  "notifications",
])

const privilegedRoles = new Set<WorkspaceRole>(["owner", "admin", "manager"])
const administrativeRoles = new Set<WorkspaceRole>(["owner", "admin"])

/**
 * Computes UI affordances only. Database RLS is the security boundary.
 */
export function canPerform(context: PermissionContext): boolean {
  const { role, resource, action, userId, ownerId, assigneeIds = [] } = context

  if (resource === "audit_events") {
    return action === "read" && privilegedRoles.has(role)
  }

  if (action === "read") return true

  if (administrativeResources.has(resource)) {
    if (resource === "workspace_members") return role === "owner"
    return administrativeRoles.has(role)
  }

  if (!salesResources.has(resource)) return false
  if (privilegedRoles.has(role)) return true

  if (action === "create") return true
  if (action === "update") {
    return ownerId === userId || (resource === "tasks" && assigneeIds.includes(userId))
  }

  return false
}

export function permissionsFor(context: Omit<PermissionContext, "action">): ResourcePermissions {
  return {
    read: canPerform({ ...context, action: "read" }),
    create: canPerform({ ...context, action: "create" }),
    update: canPerform({ ...context, action: "update" }),
    delete: canPerform({ ...context, action: "delete" }),
  }
}

export function canViewAudit(role: WorkspaceRole): boolean {
  return privilegedRoles.has(role)
}
