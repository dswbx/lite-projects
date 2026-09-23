import { useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArchiveIcon, ArrowDownAZIcon, ArrowUpAZIcon, MoreHorizontalIcon, PlusIcon, RefreshCwIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import type { ModuleDefinition } from '@/components/app/module-definitions'
import { FileManager } from '@/components/app/file-manager'
import { RecordSheet } from '@/components/app/record-sheet'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { EntityType, ListRequest, WorkspaceRole } from '@/lib/domain'
import { permissionsFor, type CrmResource } from '@/lib/permissions'
import { createAuditRepository, crmRepository, type CrmTableName } from '@/lib/repositories'
import { supabase } from '@/lib/supabase'
import { useRelationshipOptions } from '@/hooks/use-relationship-options'

type WorkspaceSummary = { id: string; name: string; slug: string; role: string; timezone: string; currency: string }
const pageSize = 50
const auditRepository = createAuditRepository()

export function ModulePage({ definition, workspace, session }: { definition: ModuleDefinition; workspace: WorkspaceSummary; session: Session }) {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [editorOpen, setEditorOpen] = useState(false)
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const editorReturnFocusRef = useRef<HTMLElement | null>(null)
  const resource = definition.table as CrmResource
  const basePermissions = permissionsFor({ role: workspace.role as WorkspaceRole, resource, userId: session.user.id })
  const canCreate = basePermissions.create && !definition.createDisabled
  const relationshipQuery = useRelationshipOptions(workspace.id, definition.fields)
  const relationshipOptions = relationshipQuery.data ?? {}

  function openEditor(record: Record<string, unknown> | null, trigger: EventTarget | null) {
    editorReturnFocusRef.current = trigger instanceof HTMLElement ? trigger : null
    setSelected(record)
    setEditorOpen(true)
  }

  const query = useQuery({
    queryKey: ['module', definition.table, workspace.id, page, search, sortField, sortDirection],
    queryFn: async () => {
      const request: Partial<ListRequest> = {
        page: page + 1,
        pageSize,
        sort: { field: sortField, direction: sortDirection },
        filters: search.trim() ? [{ field: definition.columns[0]?.key ?? 'id', operator: 'ilike', value: `%${search.trim()}%` }] : [],
      }
      const result = definition.appendOnly
        ? await auditRepository.list(workspace.id, request)
        : await crmRepository.list(definition.table as CrmTableName, workspace.id, request)
      if (!result.ok) throw new Error(result.error.message)
      return { rows: result.data.items as Record<string, unknown>[], count: result.data.total }
    },
    enabled: definition.key !== 'files',
  })

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const context = { workspaceId: workspace.id, userId: session.user.id, role: workspace.role as WorkspaceRole, ...(definition.ownerField ? { ownerId: session.user.id } : {}), entityType: entityTypeFor(definition) }
      const payload = definition.key === 'members' ? { ...values, workspace_owner_id: session.user.id } : values
      const result = selected
        ? await crmRepository.update(definition.table as CrmTableName, String(selected.id), payload, context)
        : await crmRepository.create(definition.table as CrmTableName, payload, context)
      if (!result.ok) throw new Error(result.error.message)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['module', definition.table] }); setEditorOpen(false); setSelected(null); toast.success(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} saved`) },
    onError: (error) => toast.error(error.message),
  })

  const removeMutation = useMutation({
    mutationFn: async (record: Record<string, unknown>) => {
      const result = await crmRepository.remove(definition.table as CrmTableName, String(record.id), { workspaceId: workspace.id, userId: session.user.id, entityType: entityTypeFor(definition) })
      if (!result.ok) throw new Error(result.error.message)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['module', definition.table] }); setDeleteTarget(null); toast.success(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} removed`) },
    onError: (error) => toast.error(error.message),
  })

  const convertMutation = useMutation({
    mutationFn: async (lead: Record<string, unknown>) => {
      const { data: pipelines, error: pipelineError } = await supabase.from('pipelines').select('id').eq('workspace_id', workspace.id).order('created_at').limit(1)
      if (pipelineError) throw pipelineError
      const pipeline = pipelines?.[0]
      if (!pipeline) throw new Error('Create a pipeline before converting a lead.')
      const { data: stages, error: stageError } = await supabase.from('pipeline_stages').select('id').eq('workspace_id', workspace.id).eq('pipeline_id', pipeline.id).order('position').limit(1)
      if (stageError) throw stageError
      const stage = stages?.[0]
      if (!stage) throw new Error('Create a pipeline stage before converting a lead.')
      const result = await crmRepository.convertLead({
        workspaceId: workspace.id,
        leadId: String(lead.id),
        actorId: session.user.id,
        ownerId: session.user.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
        createOpportunity: true,
        opportunityName: `${String(lead.company)} — new opportunity`,
      })
      if (!result.ok) throw new Error(result.error.message)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['module', 'leads'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      toast.success('Lead converted to an account, contact, and opportunity')
    },
    onError: (error) => toast.error(error.message),
  })

  const totalPages = Math.max(1, Math.ceil((query.data?.count ?? 0) / pageSize))
  const pageLabel = useMemo(() => `${(query.data?.count ?? 0).toLocaleString()} records · page ${page + 1} of ${totalPages}`, [page, query.data?.count, totalPages])

  if (definition.key === 'files') return <FileManager workspace={workspace} session={session} />

  return <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6"><header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">{workspace.name}</p><h1 className="text-2xl font-semibold tracking-tight">{definition.label}</h1><p className="mt-1 text-sm text-muted-foreground">{definition.description}</p></div>{!definition.appendOnly && canCreate && <Button onClick={(event) => openEditor(null, event.currentTarget)}><PlusIcon data-icon="inline-start" />Create {definition.singular}</Button>}</header>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><InputGroup className="max-w-md"><InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon><InputGroupInput value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder={`Search ${definition.label.toLowerCase()}…`} aria-label={`Search ${definition.label.toLowerCase()}`} /></InputGroup><span className="font-mono text-xs text-muted-foreground">{pageLabel}</span></div>
    <Card className="min-w-0 overflow-hidden"><CardContent className="p-0">{query.isLoading ? <div className="flex flex-col gap-2 p-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-10" />)}</div> : query.error ? <p className="p-6 text-sm text-destructive">{query.error.message}</p> : query.data?.rows.length === 0 ? <Empty className="min-h-72"><EmptyHeader><EmptyMedia variant="icon"><definition.icon /></EmptyMedia><EmptyTitle>No {definition.label.toLowerCase()}</EmptyTitle><EmptyDescription>{search ? 'No records match this search.' : canCreate ? `Create the first ${definition.singular} in this workspace.` : `No ${definition.label.toLowerCase()} are available.`}</EmptyDescription></EmptyHeader>{!definition.appendOnly && canCreate && <EmptyContent><Button onClick={(event) => openEditor(null, event.currentTarget)}><PlusIcon data-icon="inline-start" />Create {definition.singular}</Button></EmptyContent>}</Empty> : <Table><TableHeader><TableRow>{definition.columns.map((column) => <TableHead key={column.key}><Button variant="ghost" size="sm" className="-ml-3" onClick={() => { setPage(0); if (sortField === column.key) setSortDirection((value) => value === 'asc' ? 'desc' : 'asc'); else { setSortField(column.key); setSortDirection('asc') } }} aria-label={`Sort by ${column.label}${sortField === column.key ? `, currently ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : ''}`}>{column.label}{sortField === column.key && (sortDirection === 'asc' ? <ArrowDownAZIcon aria-hidden="true" /> : <ArrowUpAZIcon aria-hidden="true" />)}</Button></TableHead>)}{!definition.appendOnly && <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>}</TableRow></TableHeader><TableBody>{query.data?.rows.map((record) => {
      const recordPermissions = permissionsFor({ role: workspace.role as WorkspaceRole, resource, userId: session.user.id, ownerId: typeof record.owner_id === 'string' ? record.owner_id : null })
      const hasActions = recordPermissions.update || recordPermissions.delete
      return <TableRow key={String(record.id)} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-ring" tabIndex={0} aria-label={`Open ${displayName(record, definition)}`} onClick={(event) => openEditor(record, event.currentTarget)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openEditor(record, event.currentTarget) } }}>{definition.columns.map((column) => <TableCell key={column.key}>{formatCell(record[column.key], column.format, relationshipOptions[column.key], workspace)}</TableCell>)}{!definition.appendOnly && <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>{hasActions && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${displayName(record, definition)}`}><MoreHorizontalIcon aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup>{definition.key === 'leads' && record.status !== 'converted' && recordPermissions.update && <DropdownMenuItem onSelect={() => convertMutation.mutate(record)}><RefreshCwIcon aria-hidden="true" />Convert lead</DropdownMenuItem>}{recordPermissions.update && <DropdownMenuItem onSelect={(event) => openEditor(record, event.currentTarget)}><ArchiveIcon aria-hidden="true" />Edit</DropdownMenuItem>}{recordPermissions.delete && <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(record)}><Trash2Icon aria-hidden="true" />Remove</DropdownMenuItem>}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>}</TableCell>}</TableRow>
    })}</TableBody></Table>}</CardContent></Card>
    <Pagination><PaginationContent><PaginationItem><PaginationPrevious href="#" aria-disabled={page === 0} onClick={(event) => { event.preventDefault(); if (page > 0) setPage((value) => value - 1) }} /></PaginationItem><PaginationItem><Badge variant="outline">{page + 1} / {totalPages}</Badge></PaginationItem><PaginationItem><PaginationNext href="#" aria-disabled={page + 1 >= totalPages} onClick={(event) => { event.preventDefault(); if (page + 1 < totalPages) setPage((value) => value + 1) }} /></PaginationItem></PaginationContent></Pagination>
    <RecordSheet definition={definition} record={selected} open={editorOpen} onOpenChange={setEditorOpen} onSave={(values) => saveMutation.mutateAsync(values)} loading={saveMutation.isPending} returnFocusRef={editorReturnFocusRef} options={relationshipOptions} readOnly={Boolean(definition.appendOnly || (selected && !permissionsFor({ role: workspace.role as WorkspaceRole, resource, userId: session.user.id, ownerId: typeof selected.owner_id === 'string' ? selected.owner_id : null }).update))} />
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this {definition.singular}?</AlertDialogTitle><AlertDialogDescription>This removes the record and any dependent links. The audit history keeps a record of the action.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => deleteTarget && removeMutation.mutate(deleteTarget)}>Remove {definition.singular}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </main>
}

function displayName(record: Record<string, unknown>, definition: ModuleDefinition) { return String(record.name ?? record.title ?? record.subject ?? record.quote_number ?? `${definition.singular} ${String(record.id).slice(0, 8)}`) }
function entityTypeFor(definition: ModuleDefinition) { return definition.singular.replaceAll(' ', '_') as EntityType }
function formatCell(value: unknown, format: string | undefined, options: Array<{ value: string; label: string }> | undefined, workspace: Pick<WorkspaceSummary, 'currency' | 'timezone'>) {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>
  if (format === 'money') return <span className="font-mono tabular-nums">{new Intl.NumberFormat('en-US', { style: 'currency', currency: workspace.currency, maximumFractionDigits: 0 }).format(Number(value))}</span>
  if (format === 'date') {
    const raw = String(value)
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    const date = new Date(dateOnly ? `${raw}T00:00:00Z` : raw)
    return Number.isNaN(date.valueOf()) ? raw : <span className="font-mono text-xs">{new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: dateOnly ? 'UTC' : workspace.timezone }).format(date)}</span>
  }
  if (format === 'status') return <Badge variant="secondary">{String(value).replaceAll('_', ' ')}</Badge>
  if (format === 'relation') return options?.find((option) => option.value === String(value))?.label ?? <span className="font-mono text-xs text-muted-foreground">{String(value)}</span>
  if (typeof value === 'boolean') return <Badge variant={value ? 'default' : 'outline'}>{value ? 'Yes' : 'No'}</Badge>
  return String(value)
}
