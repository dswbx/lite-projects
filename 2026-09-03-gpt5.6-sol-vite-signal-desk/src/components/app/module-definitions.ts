import type { LucideIcon } from 'lucide-react'
import {
  ActivityIcon, BadgeDollarSignIcon, Building2Icon,
  ClipboardCheckIcon, ContactRoundIcon, FileStackIcon, FlagIcon, LayoutDashboardIcon,
  ListFilterIcon, MegaphoneIcon, PackageIcon, PanelsTopLeftIcon, ScrollTextIcon, SlidersHorizontalIcon,
  Settings2Icon, TagsIcon, UsersRoundIcon,
} from 'lucide-react'

export type RelationTable = 'accounts' | 'contacts' | 'leads' | 'opportunities' | 'tasks' | 'quotes' | 'campaigns' | 'price_books' | 'profiles'
export type FieldType = 'text' | 'email' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select' | 'checkbox' | 'relation'

export type ModuleField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  relation?: { table: RelationTable; labelFields: string[]; optional?: boolean; workspaceScoped?: boolean }
}

export type ModuleDefinition = {
  key: string
  table: string
  label: string
  singular: string
  description: string
  icon: LucideIcon
  columns: { key: string; label: string; format?: 'money' | 'date' | 'status' | 'person' | 'relation' }[]
  fields: ModuleField[]
  ownerField?: boolean
  appendOnly?: boolean
  createDisabled?: boolean
}

export const specialNavigation = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboardIcon },
  { key: 'pipeline', label: 'Pipeline', icon: PanelsTopLeftIcon },
  { key: 'settings', label: 'Settings', icon: SlidersHorizontalIcon },
]

export const modules: ModuleDefinition[] = [
  { key: 'accounts', table: 'accounts', label: 'Accounts', singular: 'account', description: 'Companies and buying organizations.', icon: Building2Icon, ownerField: true,
    columns: [{ key: 'name', label: 'Account' }, { key: 'industry', label: 'Industry' }, { key: 'lifecycle_stage', label: 'Stage', format: 'status' }, { key: 'annual_revenue', label: 'Revenue', format: 'money' }],
    fields: [{ key: 'name', label: 'Account name', type: 'text', required: true }, { key: 'industry', label: 'Industry', type: 'text' }, { key: 'website', label: 'Website', type: 'text' }, { key: 'annual_revenue', label: 'Annual revenue', type: 'number' }, { key: 'lifecycle_stage', label: 'Lifecycle stage', type: 'select', options: ['prospect', 'qualified', 'customer', 'partner', 'inactive'] }] },
  { key: 'contacts', table: 'contacts', label: 'Contacts', singular: 'contact', description: 'People involved in every buying decision.', icon: ContactRoundIcon, ownerField: true,
    columns: [{ key: 'first_name', label: 'First' }, { key: 'last_name', label: 'Last' }, { key: 'account_id', label: 'Account', format: 'relation' }, { key: 'title', label: 'Title' }, { key: 'email', label: 'Email' }],
    fields: [{ key: 'first_name', label: 'First name', type: 'text', required: true }, { key: 'last_name', label: 'Last name', type: 'text', required: true }, { key: 'title', label: 'Title', type: 'text' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone', type: 'text' }, { key: 'account_id', label: 'Account', type: 'relation', relation: { table: 'accounts', labelFields: ['name'], optional: true } }] },
  { key: 'leads', table: 'leads', label: 'Leads', singular: 'lead', description: 'Unqualified interest ready for review.', icon: FlagIcon, ownerField: true,
    columns: [{ key: 'first_name', label: 'First' }, { key: 'last_name', label: 'Last' }, { key: 'company', label: 'Company' }, { key: 'status', label: 'Status', format: 'status' }, { key: 'score', label: 'Score' }],
    fields: [{ key: 'first_name', label: 'First name', type: 'text', required: true }, { key: 'last_name', label: 'Last name', type: 'text', required: true }, { key: 'company', label: 'Company', type: 'text', required: true }, { key: 'email', label: 'Email', type: 'email' }, { key: 'status', label: 'Status', type: 'select', options: ['new', 'working', 'qualified', 'disqualified'] }, { key: 'source', label: 'Source', type: 'select', options: ['website', 'referral', 'event', 'outbound', 'partner'] }, { key: 'score', label: 'Score', type: 'number' }] },
  { key: 'activities', table: 'activities', label: 'Activities', singular: 'activity', description: 'Calls, meetings, emails, and milestones.', icon: ActivityIcon, ownerField: true,
    columns: [{ key: 'subject', label: 'Subject' }, { key: 'type', label: 'Type', format: 'status' }, { key: 'account_id', label: 'Account', format: 'relation' }, { key: 'occurred_at', label: 'When', format: 'date' }],
    fields: [{ key: 'subject', label: 'Subject', type: 'text', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['call', 'meeting', 'email', 'note', 'demo', 'stage_change'] }, { key: 'occurred_at', label: 'Date and time', type: 'datetime-local' }, { key: 'description', label: 'Details', type: 'textarea' }, { key: 'account_id', label: 'Account', type: 'relation', relation: { table: 'accounts', labelFields: ['name'], optional: true } }, { key: 'contact_id', label: 'Contact', type: 'relation', relation: { table: 'contacts', labelFields: ['first_name', 'last_name'], optional: true } }, { key: 'opportunity_id', label: 'Opportunity', type: 'relation', relation: { table: 'opportunities', labelFields: ['name'], optional: true } }] },
  { key: 'tasks', table: 'tasks', label: 'Tasks', singular: 'task', description: 'Assigned follow-up and due work.', icon: ClipboardCheckIcon, ownerField: true,
    columns: [{ key: 'title', label: 'Task' }, { key: 'account_id', label: 'Account', format: 'relation' }, { key: 'priority', label: 'Priority', format: 'status' }, { key: 'status', label: 'Status', format: 'status' }, { key: 'due_at', label: 'Due', format: 'date' }],
    fields: [{ key: 'title', label: 'Task title', type: 'text', required: true }, { key: 'description', label: 'Details', type: 'textarea' }, { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high', 'urgent'] }, { key: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'completed', 'cancelled'] }, { key: 'due_at', label: 'Due date', type: 'datetime-local' }, { key: 'account_id', label: 'Account', type: 'relation', relation: { table: 'accounts', labelFields: ['name'], optional: true } }, { key: 'contact_id', label: 'Contact', type: 'relation', relation: { table: 'contacts', labelFields: ['first_name', 'last_name'], optional: true } }, { key: 'opportunity_id', label: 'Opportunity', type: 'relation', relation: { table: 'opportunities', labelFields: ['name'], optional: true } }] },
  { key: 'products', table: 'products', label: 'Products', singular: 'product', description: 'Products available for quotes.', icon: PackageIcon,
    columns: [{ key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'unit_price', label: 'Unit price', format: 'money' }, { key: 'is_active', label: 'Active' }],
    fields: [{ key: 'name', label: 'Product name', type: 'text', required: true }, { key: 'sku', label: 'SKU', type: 'text', required: true }, { key: 'unit_price', label: 'Unit price', type: 'number' }, { key: 'is_active', label: 'Active', type: 'checkbox' }] },
  { key: 'price-books', table: 'price_books', label: 'Price books', singular: 'price book', description: 'Regional and negotiated price collections.', icon: TagsIcon,
    columns: [{ key: 'name', label: 'Price book' }, { key: 'currency', label: 'Currency' }, { key: 'is_active', label: 'Active' }],
    fields: [{ key: 'name', label: 'Price book name', type: 'text', required: true }, { key: 'currency', label: 'Currency', type: 'select', options: ['USD', 'EUR', 'GBP', 'CHF'] }, { key: 'is_active', label: 'Active', type: 'checkbox' }] },
  { key: 'quotes', table: 'quotes', label: 'Quotes', singular: 'quote', description: 'Commercial proposals and approvals.', icon: BadgeDollarSignIcon, ownerField: true,
    columns: [{ key: 'quote_number', label: 'Quote' }, { key: 'opportunity_id', label: 'Opportunity', format: 'relation' }, { key: 'status', label: 'Status', format: 'status' }, { key: 'total_amount', label: 'Total', format: 'money' }, { key: 'expires_at', label: 'Expires', format: 'date' }],
    fields: [{ key: 'quote_number', label: 'Quote number', type: 'text', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['draft', 'sent', 'accepted', 'rejected', 'expired'] }, { key: 'expires_at', label: 'Expiry date', type: 'date' }, { key: 'discount_percent', label: 'Discount percent', type: 'number' }, { key: 'total_amount', label: 'Total amount', type: 'number' }, { key: 'opportunity_id', label: 'Opportunity', type: 'relation', required: true, relation: { table: 'opportunities', labelFields: ['name'] } }, { key: 'price_book_id', label: 'Price book', type: 'relation', relation: { table: 'price_books', labelFields: ['name'], optional: true } }] },
  { key: 'campaigns', table: 'campaigns', label: 'Campaigns', singular: 'campaign', description: 'Audience programs without outbound delivery.', icon: MegaphoneIcon, ownerField: true,
    columns: [{ key: 'name', label: 'Campaign' }, { key: 'channel', label: 'Channel', format: 'status' }, { key: 'status', label: 'Status', format: 'status' }, { key: 'budget', label: 'Budget', format: 'money' }],
    fields: [{ key: 'name', label: 'Campaign name', type: 'text', required: true }, { key: 'channel', label: 'Channel', type: 'select', options: ['email', 'event', 'webinar', 'social', 'partner'] }, { key: 'status', label: 'Status', type: 'select', options: ['draft', 'scheduled', 'active', 'completed', 'cancelled'] }, { key: 'start_date', label: 'Start date', type: 'date' }, { key: 'end_date', label: 'End date', type: 'date' }, { key: 'budget', label: 'Budget', type: 'number' }] },
  { key: 'files', table: 'file_assets', label: 'Files', singular: 'file', description: 'Private attachments stored by workspace.', icon: FileStackIcon, appendOnly: true,
    columns: [{ key: 'file_name', label: 'File' }, { key: 'mime_type', label: 'Type' }, { key: 'size_bytes', label: 'Size' }, { key: 'created_at', label: 'Uploaded', format: 'date' }], fields: [] },
  { key: 'custom-fields', table: 'custom_field_definitions', label: 'Custom fields', singular: 'custom field', description: 'Workspace-specific record attributes.', icon: Settings2Icon,
    columns: [{ key: 'name', label: 'Field' }, { key: 'entity_type', label: 'Entity', format: 'status' }, { key: 'data_type', label: 'Type', format: 'status' }, { key: 'is_required', label: 'Required' }],
    fields: [{ key: 'name', label: 'Field name', type: 'text', required: true }, { key: 'entity_type', label: 'Entity', type: 'select', options: ['account', 'contact', 'lead', 'opportunity'] }, { key: 'data_type', label: 'Data type', type: 'select', options: ['text', 'number', 'date', 'boolean'] }, { key: 'is_required', label: 'Required', type: 'checkbox' }] },
  { key: 'saved-views', table: 'saved_views', label: 'Saved views', singular: 'saved view', description: 'Reusable filters for each sales desk.', icon: ListFilterIcon, ownerField: true,
    columns: [{ key: 'name', label: 'View' }, { key: 'entity_type', label: 'Entity', format: 'status' }, { key: 'created_at', label: 'Created', format: 'date' }],
    fields: [{ key: 'name', label: 'View name', type: 'text', required: true }, { key: 'entity_type', label: 'Entity', type: 'select', options: ['account', 'contact', 'lead', 'opportunity', 'task'] }] },
  { key: 'members', table: 'workspace_members', label: 'Members', singular: 'member', description: 'Workspace access and operating roles. New invitations require an external identity provider.', icon: UsersRoundIcon, createDisabled: true,
    columns: [{ key: 'user_id', label: 'User', format: 'relation' }, { key: 'role', label: 'Role', format: 'status' }, { key: 'created_at', label: 'Joined', format: 'date' }],
    fields: [{ key: 'user_id', label: 'User', type: 'relation', required: true, relation: { table: 'profiles', labelFields: ['full_name', 'email'], workspaceScoped: false } }, { key: 'role', label: 'Role', type: 'select', options: ['owner', 'admin', 'manager', 'member'] }] },
  { key: 'audit', table: 'audit_events', label: 'Audit history', singular: 'audit event', description: 'An append-only record of workspace changes.', icon: ScrollTextIcon, appendOnly: true,
    columns: [{ key: 'action', label: 'Action', format: 'status' }, { key: 'entity_type', label: 'Entity' }, { key: 'summary', label: 'Summary' }, { key: 'created_at', label: 'When', format: 'date' }],
    fields: [{ key: 'action', label: 'Action', type: 'text' }, { key: 'entity_type', label: 'Entity type', type: 'text' }, { key: 'entity_id', label: 'Entity ID', type: 'text' }, { key: 'summary', label: 'Summary', type: 'textarea' }, { key: 'before_data', label: 'Before', type: 'textarea' }, { key: 'after_data', label: 'After', type: 'textarea' }, { key: 'created_at', label: 'Occurred at', type: 'text' }, { key: 'actor_id', label: 'Actor', type: 'relation', relation: { table: 'profiles', labelFields: ['full_name', 'email'], workspaceScoped: false } }] },
]

export const allNavigation = [...specialNavigation, ...modules.map(({ key, label, icon }) => ({ key, label, icon }))]
export const moduleByKey = new Map(modules.map((module) => [module.key, module]))
